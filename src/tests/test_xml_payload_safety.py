"""The uploaded-XML parser must refuse entity-expansion payloads.

CodeQL `py/xml-bomb`, severity high: `raw_bytes` reaches this parser from a file
upload, and both `pandas.read_xml` (lxml resolves entities by default) and
`xml.etree.ElementTree` expand internal entities. A billion-laughs payload can
exhaust memory before any size limit applies, because the expansion happens
inside the parser.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

pd = pytest.importorskip("pandas")

from server import _evcs_parse_xml_payload_to_df  # noqa: E402


BILLION_LAUGHS = b"""<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
]>
<rows><row><value>&lol4;</value></row></rows>
"""

EXTERNAL_ENTITY = b"""<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<rows><row><value>&xxe;</value></row></rows>
"""

BENIGN = b"""<?xml version="1.0"?>
<rows>
  <row><station>EVCS-01</station><amps>32</amps></row>
  <row><station>EVCS-02</station><amps>16</amps></row>
</rows>
"""


def test_billion_laughs_is_rejected():
    """The classic entity-expansion bomb must not be parsed at all."""
    with pytest.raises(ValueError, match="(?i)rejected|entity"):
        _evcs_parse_xml_payload_to_df(BILLION_LAUGHS, pd)


def test_external_entity_is_rejected():
    """XXE: an external entity reference must never be resolved."""
    with pytest.raises(ValueError, match="(?i)rejected|entity"):
        _evcs_parse_xml_payload_to_df(EXTERNAL_ENTITY, pd)


def test_benign_xml_still_parses():
    """The guard must not break legitimate uploads."""
    frame = _evcs_parse_xml_payload_to_df(BENIGN, pd)

    assert len(frame) == 2
    assert "station" in [str(c) for c in frame.columns]


def test_malformed_xml_raises_value_error_not_a_raw_parser_error():
    """A broken document should surface as a handled error, not a stack trace."""
    with pytest.raises(ValueError):
        _evcs_parse_xml_payload_to_df(b"<rows><row>unclosed", pd)
