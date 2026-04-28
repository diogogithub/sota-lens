from __future__ import annotations

import argparse
import json
from pathlib import Path

from .pipeline import (
    build_from_csv,
    enrich_graph_from_csv,
    graph_summary,
    graph_to_web_dataset,
    read_gexf,
    write_json,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sota-lens",
        description="Build citation-network artifacts for exploratory state-of-the-art reviews.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    build = sub.add_parser("build", help="Build graph artifacts from an article CSV.")
    build.add_argument("--articles", required=True, help="Input article CSV.")
    build.add_argument("--out", required=True, help="Output directory.")
    build.add_argument("--include-external-references", action="store_true", help="Include DOI-only reference nodes outside the input corpus.")
    build.add_argument("--max-depth", type=int, default=None, help="Optional maximum depth to include.")
    build.add_argument("--web-json", default=None, help="Optional browser JSON output path.")
    build.add_argument("--web-limit", type=int, default=500, help="Maximum nodes in browser JSON output.")

    inspect = sub.add_parser("inspect", help="Inspect a GEXF graph.")
    inspect.add_argument("graph", help="Input .gexf file.")
    inspect.add_argument("--articles", default=None, help="Optional article CSV used to enrich graph metadata before inspection.")

    web = sub.add_parser("web-data", help="Convert a GEXF graph to browser JSON.")
    web.add_argument("--graph", required=True, help="Input .gexf file.")
    web.add_argument("--articles", default=None, help="Optional article CSV used to enrich GEXF nodes with metadata.")
    web.add_argument("--out", required=True, help="Output JSON path.")
    web.add_argument("--limit", type=int, default=500, help="Maximum nodes to include.")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "build":
        summary = build_from_csv(
            args.articles,
            args.out,
            include_external_references=args.include_external_references,
            max_depth=args.max_depth,
            web_json=args.web_json,
            web_limit=args.web_limit,
        )
        print(json.dumps(summary, indent=2))
        return 0

    if args.command == "inspect":
        graph = read_gexf(args.graph)
        if args.articles:
            graph = enrich_graph_from_csv(graph, args.articles)
        print(json.dumps(graph_summary(graph), indent=2))
        return 0

    if args.command == "web-data":
        graph = read_gexf(args.graph)
        if args.articles:
            graph = enrich_graph_from_csv(graph, args.articles)
        write_json(args.out, graph_to_web_dataset(graph, limit=args.limit))
        print(f"Wrote {Path(args.out)}")
        return 0

    parser.error("unknown command")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
