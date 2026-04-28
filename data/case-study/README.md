# DPM/SAR case-study data

This directory contains the proof-of-concept corpus used in the SotA Lens paper and website demo.

## Files

- `articles_full.csv` — DOI-level article table with titles, authors, subject terms, years, URLs, search depth, and reference lists.
- `graph.gexf` — directed citation graph suitable for Gephi and for `sota-lens web-data`.
- `scholar_seed_results.csv` — original seed-result table used before DOI-level metadata expansion.
- `failed.csv` — seed records that could not be resolved automatically.
- `failed_references.csv` — reference DOIs that could not be resolved automatically.
- `subject_terms.txt` — unique subject terms extracted from the corpus.
- `analysis_output.txt` — ranking output from the original exploratory analysis.
- `references.bib` — bibliography records used by the manuscript/preprint.

## Regenerating the website demo

```bash
sota-lens web-data \
  --graph data/case-study/graph.gexf \
  --articles data/case-study/articles_full.csv \
  --out website/assets/data/case-study-demo.json \
  --limit 500
```

The `--articles` flag is important for the public demo because the GEXF primarily represents topology, while the CSV preserves richer article metadata.
