"""
ATC Terminology Normalizer and Post-Processor.
Cleans up, standardizes, and enhances aviation radio transcripts for terms like
runways, headings, altitudes, flight levels, localizers, and callsigns.
"""

import re
from typing import List, Dict, Any

# Number word mappings
NUM_WORDS = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "tree": "3",
    "four": "4", "fower": "4", "five": "5", "fife": "5", "six": "6",
    "seven": "7", "eight": "8", "ait": "8", "nine": "9", "niner": "9"
}


def normalize_atc_text(text: str) -> str:
    """
    Normalizes recognized text into standard ATC phraseology format.
    """
    if not text:
        return text

    normalized = text

    # 1. Acronym standardizations
    acronym_replacements = [
        (r'\b[iI]\s*[lL]\s*[sS]\b', 'ILS'),
        (r'\b[dD]\s*[mM]\s*[eE]\b', 'DME'),
        (r'\b[vV]\s*[oO]\s*[rR]\b', 'VOR'),
        (r'\b[vV]\s*[fF]\s*[rR]\b', 'VFR'),
        (r'\b[iI]\s*[fF]\s*[rR]\b', 'IFR'),
        (r'\b[qQ]\s*[nN]\s*[hH]\b', 'QNH'),
        (r'\blocaliser\b', 'localizer'),
        (r'\brodger\b', 'roger'),
        (r'\bwilco\b', 'wilco'),
    ]
    for pattern, repl in acronym_replacements:
        normalized = re.sub(pattern, repl, normalized, flags=re.IGNORECASE)

    # 2. Runway designations (e.g., "runway two seven left" or "runway 2-7" -> "runway 27L")
    def format_runway(match):
        prefix = match.group(1)
        rwy_words = match.group(2).strip().split()
        digits = []
        suffix = ""
        for w in rwy_words:
            low = w.lower().strip(".,-")
            if low in NUM_WORDS:
                digits.append(NUM_WORDS[low])
            elif low in ["left", "l"]:
                suffix = "L"
            elif low in ["right", "r"]:
                suffix = "R"
            elif low in ["center", "centre", "c"]:
                suffix = "C"
            else:
                num_only = re.sub(r'[^0-9]', '', low)
                if num_only:
                    digits.append(num_only)
        rwy_num = "".join(digits)
        if len(rwy_num) == 1:
            rwy_num = "0" + rwy_num
        elif len(rwy_num) > 2:
            rwy_num = rwy_num[:2]
        return f"{prefix} {rwy_num}{suffix} "

    rwy_regex = re.compile(
        r'\b(runway)\s+((?:(?:zero|one|two|three|tree|four|fife|five|six|seven|eight|nine|niner|\d|[\d\-])\s*){1,4}(?:left|right|center|centre|l|r|c)?)\b',
        re.IGNORECASE
    )
    normalized = rwy_regex.sub(format_runway, normalized)

    # 3. Headings (e.g., "heading two seven zero" or "heading 2-7-0" -> "heading 270")
    def format_heading(match):
        prefix = match.group(1)
        hdg_raw = match.group(2).strip()
        hdg_words = hdg_raw.split()
        digits = []
        for w in hdg_words:
            low = w.lower().strip(".,-")
            if low in NUM_WORDS:
                digits.append(NUM_WORDS[low])
            else:
                num_only = re.sub(r'[^0-9]', '', low)
                if num_only:
                    digits.append(num_only)
        hdg_num = "".join(digits)
        if len(hdg_num) == 3:
            return f"{prefix} {hdg_num} "
        return match.group(0)

    hdg_regex = re.compile(
        r'\b(heading|fly heading|turn left heading|turn right heading)\s+((?:(?:zero|one|two|three|tree|four|fife|five|six|seven|eight|nine|niner|\d|[\d\-])\b\s*){1,4})',
        re.IGNORECASE
    )
    normalized = hdg_regex.sub(format_heading, normalized)

    # 4. Flight Levels (e.g., "flight level three five zero" -> "FL350")
    def format_fl(match):
        fl_raw = match.group(1).strip()
        fl_words = fl_raw.split()
        digits = []
        for w in fl_words:
            low = w.lower().strip(".,-")
            if low in NUM_WORDS:
                digits.append(NUM_WORDS[low])
            else:
                num_only = re.sub(r'[^0-9]', '', low)
                if num_only:
                    digits.append(num_only)
        fl_num = "".join(digits)
        if 2 <= len(fl_num) <= 3:
            return f"FL{fl_num} "
        return match.group(0)

    fl_regex = re.compile(
        r'\b(?:flight level|fl)\s+((?:(?:zero|one|two|three|tree|four|fife|five|six|seven|eight|nine|niner|\d|[\d\-])\b\s*){1,4})',
        re.IGNORECASE
    )
    normalized = fl_regex.sub(format_fl, normalized)

    # 5. Radio Frequencies (e.g., "one one niner point one" or "119.1")
    def format_freq(match):
        left_words = match.group(1).strip().split()
        right_words = match.group(2).strip().split()
        left_digits = [NUM_WORDS[w.lower().strip("-")] if w.lower().strip("-") in NUM_WORDS else re.sub(r'[^0-9]', '', w) for w in left_words]
        right_digits = [NUM_WORDS[w.lower().strip("-")] if w.lower().strip("-") in NUM_WORDS else re.sub(r'[^0-9]', '', w) for w in right_words]
        l_num = "".join(left_digits)
        r_num = "".join(right_digits)
        if len(l_num) == 3 and len(r_num) >= 1:
            return f"{l_num}.{r_num}"
        return match.group(0)

    freq_regex = re.compile(
        r'\b((?:(?:one|two|three|four|five|six|seven|eight|nine|niner|\d|[\d\-])\b\s*){1,4})(?:point|decimal|\.)\s*((?:(?:zero|one|two|three|four|five|six|seven|eight|nine|niner|\d|[\d\-])\b\s*){1,4})',
        re.IGNORECASE
    )
    normalized = freq_regex.sub(format_freq, normalized)

    # Clean up hyphenated callsign numbers (e.g., "United 4-2-6" -> "United 426")
    normalized = re.sub(r'\b([A-Za-z]+)\s+(\d)-(\d)(?:-(\d))?(?:-(\d))?\b', lambda m: f"{m.group(1)} {''.join(g for g in m.groups()[1:] if g)}", normalized)

    # Clean up accidental extra spaces
    normalized = re.sub(r'[ \t]{2,}', ' ', normalized).strip()
    return normalized


def normalize_segments(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalizes text for every segment in the list.
    """
    normalized_list = []
    for seg in segments:
        new_seg = dict(seg)
        if "text" in new_seg and new_seg["text"]:
            new_seg["text"] = normalize_atc_text(new_seg["text"])
        normalized_list.append(new_seg)
    return normalized_list
