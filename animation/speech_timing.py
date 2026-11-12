"""Speech timing provenance and optional language-independent Rhubarb cues."""
import json
import os
import re
import shutil
import subprocess


def edge_word(chunk):
    if chunk.get('type') != 'WordBoundary':
        return None
    start = chunk['offset'] / 10_000_000
    return {'text': chunk['text'], 'start': start,
            'end': start + chunk['duration'] / 10_000_000}


def estimate_words(text, seconds):
    words = re.findall(r'\S+', text)
    weights = [max(1, len(re.sub(r'\W', '', w))) for w in words]
    total = sum(weights) or 1
    cursor = 0
    result = []
    for word, weight in zip(words, weights):
        end = cursor + seconds * weight / total
        result.append({'text': word, 'start': cursor, 'end': end})
        cursor = end
    return result


def validate_words(words, duration):
    previous = 0
    for word in words:
        if not (0 <= word['start'] <= word['end'] <= duration + .15):
            raise ValueError('Word boundary lies outside audio')
        if word['start'] < previous - .02:
            raise ValueError('Non-monotonic word boundaries')
        previous = word['end']


def rhubarb_cues(audio, output):
    """Use phonetic recognizer for both German and English (no English-only model).

    Optional local tool; its accuracy still needs human review, particularly DE.
    """
    if not shutil.which('rhubarb'):
        return []
    wav = output.with_suffix('.wav')
    try:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(audio),
                        '-ar', '16000', '-ac', '1', str(wav)], check=True, timeout=60)
        subprocess.run(['rhubarb', '-r', 'phonetic', '-f', 'json', '-o',
                        str(output), str(wav)], check=True, timeout=120,
                       capture_output=True, text=True)
        cues = json.loads(output.read_text(encoding='utf-8')).get('mouthCues', [])
        if any(not (0 <= c['start'] <= c['end']) for c in cues):
            raise ValueError('Invalid mouth cues')
        return cues
    except (subprocess.SubprocessError, ValueError, KeyError):
        # Optional alignment failure must not discard successful narration.
        return []
    finally:
        wav.unlink(missing_ok=True)


async def edge_speech(text, voice, target):
    import edge_tts
    # edge-tts 7.3 pins certifi in its TLS context. Add an explicitly configured
    # enterprise CA bundle while retaining certificate/hostname verification.
    ca_bundle = os.environ.get('SSL_CERT_FILE') or os.environ.get('REQUESTS_CA_BUNDLE')
    if ca_bundle:
        from edge_tts.communicate import _SSL_CTX
        _SSL_CTX.load_verify_locations(cafile=ca_bundle)
    words = []
    # Explicit WordBoundary is required: edge-tts 7 defaults to sentences.
    communication = edge_tts.Communicate(text, voice, boundary='WordBoundary',
                                        proxy=os.environ.get('HTTPS_PROXY') or None)
    with target.open('wb') as audio:
        async for chunk in communication.stream():
            if chunk['type'] == 'audio':
                audio.write(chunk['data'])
            else:
                word = edge_word(chunk)
                if word:
                    words.append(word)
    return words
