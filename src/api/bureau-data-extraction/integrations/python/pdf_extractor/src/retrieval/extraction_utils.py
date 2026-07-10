import re
from bisect import bisect_right


def apply_patterns(patterns, text):
    """
    Apply every regex pattern and return unique candidates.
    """

    candidates = []

    for pattern in patterns:

        for match in re.finditer(
            pattern,
            text,
            flags=re.IGNORECASE,
        ):

            if match.groups():
                candidate = match.group(1).strip()
            else:
                candidate = match.group(0).strip()

            if candidate not in candidates:
                candidates.append(candidate)

    return candidates


def find_line_windows(text, aliases, before=5, after=5):
    """
    Chunk-independent context-window search.

    Finds every occurrence of any alias (case-insensitive) in `text`
    and returns the surrounding before/after lines as merged windows
    - deduplicated so the same span isn't returned twice.

    Matching is done against the lines joined with spaces (not line
    by line), and each match is mapped back to the line it starts
    on, so a label split across two consecutive lines (e.g.
    "CURRENT" / "BALANCE" on separate lines) is still found as one
    occurrence - without ever producing more than one anchor for it.

    Because this operates directly on raw page text rather than
    pre-chunked sections, it works regardless of how well (or badly)
    a chunker segments a given document - useful when a document's
    line layout (e.g. "Label Value" pairs with no separating colon)
    causes a chunker's heading heuristics to misclassify content as
    section headers.
    """

    if not text or not aliases:
        return []

    lines = text.split("\n")

    line_start_offsets = []
    joined_parts = []
    offset = 0

    for line in lines:
        line_start_offsets.append(offset)
        joined_parts.append(line)
        offset += len(line) + 1

    joined_text = " ".join(joined_parts).lower()

    anchor_indices = set()

    for alias in aliases:

        alias_lower = alias.lower()
        search_from = 0

        while True:

            position = joined_text.find(alias_lower, search_from)

            if position == -1:
                break

            line_index = bisect_right(line_start_offsets, position) - 1

            anchor_indices.add(line_index)

            search_from = position + len(alias_lower)

    anchor_indices = sorted(anchor_indices)

    # Merge overlapping windows into one. Two different synonym
    # aliases for the same field can anchor on adjacent lines (e.g.
    # "Credit Limit" and "Sanctioned Amount" on consecutive lines for
    # the same account) - without merging, both would produce their
    # own overlapping window and the same value would be extracted
    # twice for what is really a single occurrence.
    spans = [
        (
            max(0, index - before),
            min(len(lines), index + after + 1),
        )
        for index in anchor_indices
    ]

    merged_spans = []

    for start, end in spans:

        if merged_spans and start <= merged_spans[-1][1]:

            prev_start, prev_end = merged_spans[-1]
            merged_spans[-1] = (prev_start, max(prev_end, end))

        else:
            merged_spans.append((start, end))

    return [
        "\n".join(lines[start:end])
        for start, end in merged_spans
    ]


def as_pattern_list(patterns):
    """
    Normalize a config value that may be a single regex string or a
    list of alternative regexes into a list.
    """

    if not patterns:
        return []

    if isinstance(patterns, str):
        return [patterns]

    return list(patterns)


def first_match(patterns, text):
    """
    Try each pattern (a single regex or a list of alternatives) in
    order and return the first re.Match found. Lets one field config
    describe several known document layouts side by side - whichever
    pattern actually matches a given document "wins", with no code
    change needed to support the alternative layout.
    """

    for pattern in as_pattern_list(patterns):

        match = re.search(pattern, text)

        if match:
            return match

    return None


def first_findall(patterns, text):
    """
    Try each pattern (a single regex or a list of alternatives) in
    order and return the first non-empty re.findall() result.
    """

    for pattern in as_pattern_list(patterns):

        found = re.findall(pattern, text)

        if found:
            return found

    return []