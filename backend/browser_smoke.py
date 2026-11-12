"""Real Chromium mobile UI smoke test against mocked GitHub gateway responses.

Run after rendering MP4s, e.g.:
  .venv/bin/python backend/browser_smoke.py --portrait output/de-portrait/final.mp4 \
      --landscape output/en-landscape/final.mp4 --jszip /tmp/shorts-jszip.min.js
Requires Python Playwright and system Chromium. Uses the app's actual JSZip
version to extract real MP4 bytes. It does not call paid APIs or dispatch jobs.
This is Chromium emulation, not real iPhone Safari validation.
"""
from __future__ import annotations

import argparse
import io
import json
from pathlib import Path
import zipfile
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://studio.test'
WORKER = 'https://shorts-studio-free.ahmed-saleh2005.workers.dev'


def make_archive(video: Path) -> bytes:
    data = io.BytesIO()
    with zipfile.ZipFile(data, 'w', zipfile.ZIP_STORED) as archive:
        archive.write(video, 'final.mp4')
        report_path=video.with_name('render-report.json')
        report=json.loads(report_path.read_text()) if report_path.is_file() else {
            'requestedMode': 'ai', 'visualSource': 'vector', 'aiImageCount': 0,
            'timingSource': ['estimated'],
        }
        archive.writestr('render-report.json', json.dumps(report))
    return data.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--portrait', type=Path, required=True)
    parser.add_argument('--landscape', type=Path, required=True)
    parser.add_argument('--jszip', type=Path, required=True)
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    parser.add_argument('--output', type=Path, default=ROOT / 'output' / 'browser')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for file in (args.portrait, args.landscape, args.jszip):
        if not file.is_file():
            raise FileNotFoundError(file)
    html = (ROOT / 'index.html').read_text()
    archives = {'9:16': make_archive(args.portrait), '16:9': make_archive(args.landscape)}
    state = {'complete': False, 'posts': [], 'statuses': 0, 'run_aspect': '9:16', 'old_health': False}
    errors = []
    checks = []

    def gateway(route):
        url, method = route.request.url, route.request.method
        headers = {'access-control-allow-origin': ORIGIN,
                   'access-control-allow-headers': 'content-type,x-app-key',
                   'access-control-allow-methods': 'GET,POST,OPTIONS'}
        if method == 'OPTIONS':
            return route.fulfill(status=204, headers=headers)
        if url.endswith('/health'):
            body = {'ok': True, 'configured': True}
            if not state['old_health']:
                body['contract_version'] = 2
        elif url.endswith('/render'):
            posted = route.request.post_data_json
            state['posts'].append(posted)
            state['run_aspect'] = posted['aspect_ratio']
            body = {'accepted': True, 'job_id': posted['job_id']}
        elif '/status?' in url:
            state['statuses'] += 1
            body = {'status': 'completed' if state['complete'] else 'in_progress',
                    'conclusion': 'success' if state['complete'] else None, 'run_id': 42}
        elif 'metadata=1' in url:
            body = {'size_in_bytes': len(archives[state['run_aspect']]),
                    'run_url': 'https://github.com/example/run/42'}
        elif '/artifact?' in url:
            return route.fulfill(body=archives[state['run_aspect']],
                                 content_type='application/zip', headers=headers)
        else:
            raise AssertionError(f'Unexpected gateway request: {method} {url}')
        route.fulfill(status=202 if url.endswith('/render') else 200,
                      body=json.dumps(body), content_type='application/json', headers=headers)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium,
                    headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(viewport={'width': 440, 'height': 956},
                                      is_mobile=True, has_touch=True, device_scale_factor=1)
        context.route(ORIGIN + '/**', lambda route: route.fulfill(body=html, content_type='text/html'))
        context.route('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
                      lambda route: route.fulfill(path=str(args.jszip), content_type='application/javascript'))
        context.route(WORKER + '/**', gateway)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(ORIGIN + '/', wait_until='networkidle')
        expect(page.locator('#audioSave')).to_be_enabled()
        assert page.locator('#styleMode').input_value() == 'vector'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        checks.append('440×956 touch viewport: no horizontal overflow, free vector default')
        page.locator('#story').fill('A man receives a message. He takes his phone and reads it. Then he opens the door and leaves.')
        page.locator('#language').select_option('en-US')
        page.locator('#voice').select_option('male')
        page.locator('#targetDuration').select_option('30')
        page.locator('summary').click()
        page.locator('#appkey').fill('browser-test-owner-key')
        page.locator('#audioSave').click()
        page.wait_for_function('localStorage.getItem("shorts-studio-pending-v1") !== null')
        expect(page.locator('#audioStatus')).to_contain_text('sunucuda hazırlanıyor')
        assert len(state['posts']) == 1
        assert state['posts'][0]['video_mode'] == 'vector'
        assert state['posts'][0]['voice'] == 'male'
        assert state['posts'][0]['target_duration'] == '30'
        checks.append('explicit mode, voice, aspect and duration reach dispatch contract')
        state['complete'] = True
        page.reload(wait_until='networkidle')
        expect(page.locator('#renderedVideo')).to_be_visible(timeout=15000)
        expect(page.locator('#story')).to_have_value('A man receives a message. He takes his phone and reads it. Then he opens the door and leaves.')
        page.wait_for_function('document.getElementById("renderedVideo").videoWidth > 0')
        assert len(state['posts']) == 1
        assert page.evaluate('localStorage.getItem("shorts-studio-pending-v1")') is None
        portrait = page.locator('#renderedVideo').evaluate('(v)=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration})')
        assert portrait['height'] > portrait['width'] > 0
        expect(page.locator('#renderReport')).to_contain_text('Ücretsiz 2D vektör')
        portrait_report_path=args.portrait.with_name('render-report.json')
        portrait_report=json.loads(portrait_report_path.read_text()) if portrait_report_path.is_file() else {}
        if portrait_report.get('voice'):
            expect(page.locator('#renderReport')).to_contain_text(portrait_report['voice'])
        page.screenshot(path=str(args.output / 'mobile-portrait.png'), full_page=True)
        checks.append('reload restores session key and pending job, no second dispatch; real portrait MP4 metadata loaded')
        checks.append('real JSZip extraction, object URL MP4 preview, provenance and actual narration model display')

        # Exercise the actual event listeners with synthetic visibility. This does
        # not pretend to suspend an iOS process or test Safari background behavior.
        state['complete'] = False
        page.locator('#aspect').select_option('16:9')
        page.locator('#styleMode').select_option('ai')
        page.locator('#language').select_option('de-DE')
        page.locator('#story').fill('Ein Mann liest eine Nachricht. Danach öffnet er die Tür.')
        page.locator('#audioSave').click()
        page.wait_for_function('localStorage.getItem("shorts-studio-pending-v1") !== null')
        expect(page.locator('#audioStatus')).to_contain_text('sunucuda hazırlanıyor')
        assert len(state['posts']) == 2
        page.evaluate('''() => {
            window.__testHidden = true;
            Object.defineProperty(document, 'hidden', {configurable:true, get:()=>window.__testHidden});
            document.dispatchEvent(new Event('visibilitychange'));
        }''')
        expect(page.locator('#audioSave')).to_be_enabled(timeout=10000)
        assert page.evaluate('localStorage.getItem("shorts-studio-pending-v1")')
        assert len(state['posts']) == 2
        state['complete'] = True
        page.evaluate('window.__testHidden=false;document.dispatchEvent(new Event("visibilitychange"))')
        expect(page.locator('#renderedVideo')).to_be_visible(timeout=15000)
        page.wait_for_function('document.getElementById("renderedVideo").videoWidth > document.getElementById("renderedVideo").videoHeight')
        landscape = page.locator('#renderedVideo').evaluate('(v)=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration})')
        assert page.locator('#renderedVideo').evaluate('(v)=>v.style.aspectRatio') == '16 / 9'
        assert len(state['posts']) == 2
        assert state['posts'][-1]['video_mode'] == 'ai'
        expect(page.locator('#renderReport')).to_contain_text('0 AI görsel')
        landscape_report_path=args.landscape.with_name('render-report.json')
        landscape_report=json.loads(landscape_report_path.read_text()) if landscape_report_path.is_file() else {}
        if landscape_report.get('voice'):
            expect(page.locator('#renderReport')).to_contain_text(landscape_report['voice'])
        if landscape_report.get('ttsEngine')=='piper':
            expect(page.locator('#renderReport')).to_contain_text('Çevrimdışı ses yedeği')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(args.output / 'mobile-landscape-video.png'), full_page=True)
        checks.append('synthetic background/foreground lifecycle preserves job, pauses polling and resumes without redispatch')
        checks.append('AI selection with transparent vector fallback; real landscape MP4 metadata and preview layout')

        page.set_viewport_size({'width': 956, 'height': 440})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(args.output / 'landscape-interface.png'), full_page=True)
        checks.append('956×440 landscape interface: no horizontal overflow')
        # A stale deployed Worker must never silently reinterpret vector as AI.
        state['old_health'] = True
        page.locator('#story').fill('A different scene.')
        page.locator('#audioSave').click()
        expect(page.locator('#audioStatus')).to_contain_text('Sunucu sürümü')
        assert len(state['posts']) == 2
        checks.append('old Worker contract blocks new dispatch safely')
        assert errors == [], errors
        report = {'browser': browser.version, 'engine': 'Chromium',
                  'realIPhoneSafariTested': False, 'serverResponsesMocked': True,
                  'visibilityEventsSynthetic': True, 'checks': checks,
                  'dispatchCount': len(state['posts']), 'pageErrors': errors,
                  'portraitMetadata': portrait, 'landscapeMetadata': landscape}
        (args.output / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
        print(json.dumps(report, indent=2, ensure_ascii=False))
        browser.close()


if __name__ == '__main__':
    main()
