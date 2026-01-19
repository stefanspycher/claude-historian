"""JSONL file handling utilities."""

import json

def load_jsonl_file(path):
    """Load JSONL file, returning events and errors."""
    events = []
    errors = []
    
    with open(path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                event = json.loads(line)
                events.append(event)
            except json.JSONDecodeError as e:
                errors.append({
                    'line': line_num,
                    'error': str(e)
                })
    
    return events, errors
