import sys
import json
import re

# Ensure stdout handles UTF-8 on Windows
sys.stdout.reconfigure(encoding='utf-8')

def extract_video_id(url_or_id):
    if not url_or_id:
        return None
    url_or_id = url_or_id.strip()
    if re.match(r'^[A-Za-z0-9_-]{11}$', url_or_id):
        return url_or_id
    patterns = [
        r'(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})',
        r'[\?&]v=([A-Za-z0-9_-]{11})'
    ]
    for p in patterns:
        m = re.search(p, url_or_id)
        if m:
            return m.group(1)
    return None

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Video ID or URL required"}))
        sys.exit(1)

    raw_input = sys.argv[1]
    video_id = extract_video_id(raw_input)
    if not video_id:
        print(json.dumps({"error": f"Invalid YouTube Video ID/URL: {raw_input}"}))
        sys.exit(1)

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)
        
        # Try to find Korean or English or fallback to any available
        try:
            transcript = transcript_list.find_transcript(['ko', 'en'])
        except Exception:
            # Fallback to first available transcript
            transcript = next(iter(transcript_list))
            
        data = transcript.fetch()
        
        lines = []
        full_text_parts = []
        for item in data:
            # item has .text, .start, .duration
            text = getattr(item, 'text', '') if hasattr(item, 'text') else str(item)
            text = text.replace('\n', ' ').strip()
            start = getattr(item, 'start', 0.0) if hasattr(item, 'start') else 0.0
            duration = getattr(item, 'duration', 0.0) if hasattr(item, 'duration') else 0.0
            if text:
                lines.append({
                    "start": round(start, 2),
                    "duration": round(duration, 2),
                    "text": text
                })
                full_text_parts.append(text)

        result = {
            "ok": True,
            "videoId": video_id,
            "language": transcript.language_code,
            "languageName": transcript.language,
            "isGenerated": transcript.is_generated,
            "lineCount": len(lines),
            "fullText": " ".join(full_text_parts),
            "lines": lines
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "ok": False,
            "error": str(e),
            "videoId": video_id
        }, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
