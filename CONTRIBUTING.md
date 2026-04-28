# Contributing to SotA Lens

Contributions are welcome through GitHub issues and pull requests.

## Development setup

```bash
git clone https://github.com/diogogithub/sota-lens.git
cd sota-lens
python -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -e ".[dev]"
pytest
```

## Good issues to open

- CSV files that fail to parse.
- Export bugs in GEXF or web JSON output.
- Documentation examples that are unclear.
- Suggestions for additional review-methodology comparisons.
- Accessibility issues in the web explorer.

## Pull request checklist

Before opening a pull request:

- run `pytest`;
- keep public documentation written for external users;
- update docs if behaviour changes;
- avoid committing generated build folders unless they are part of the public website or case-study data.
