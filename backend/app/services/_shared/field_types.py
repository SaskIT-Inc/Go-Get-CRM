"""Short aliases for the SQLAlchemy column types every service's schema.py
uses — moved here verbatim from the old models/definitions.py so schema
files stay one-line-per-field readable."""

from sqlalchemy import Boolean, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB

S = String
T = Text
I = Integer
N = Numeric
B = Boolean
J = JSONB
