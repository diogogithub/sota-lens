from __future__ import annotations

import ast
import csv
import json
import math
import re
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

import networkx as nx


DOI_PATTERN = re.compile(r"10\.\d{4,9}/[-._;()/:A-Z0-9]+", re.IGNORECASE)


def normalize_doi(value: Any) -> str:
    """Normalize a DOI-like value into a lowercase graph identifier."""
    if value is None:
        return ""
    text = str(value).strip()
    match = DOI_PATTERN.search(text)
    if match:
        text = match.group(0)
    return text.strip().strip(".").lower()


def parse_listish(value: Any) -> list[Any]:
    """Parse JSON/Python-list-like strings, semicolon strings, or raw values."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    if isinstance(value, dict):
        return [value]
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "null", "[]"}:
        return []

    for parser in (json.loads, ast.literal_eval):
        try:
            parsed = parser(text)
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, tuple):
                return list(parsed)
            if isinstance(parsed, dict):
                return [parsed]
        except Exception:
            pass

    if ";" in text:
        return [part.strip() for part in text.split(";") if part.strip()]
    if "|" in text:
        return [part.strip() for part in text.split("|") if part.strip()]
    return [text]


def parse_references(value: Any) -> list[str]:
    """Extract referenced DOIs from a references column or attribute."""
    refs: list[str] = []
    for item in parse_listish(value):
        if isinstance(item, dict):
            candidate = item.get("doi") or item.get("DOI") or item.get("id") or item.get("identifier") or ""
        else:
            candidate = item
        doi = normalize_doi(candidate)
        if doi:
            refs.append(doi)

    # Fallback for long free-text cells containing many DOI-looking substrings.
    if not refs and isinstance(value, str):
        refs = [normalize_doi(m.group(0)) for m in DOI_PATTERN.finditer(value)]

    return list(dict.fromkeys(refs))


def parse_authors(value: Any) -> list[str]:
    """Parse an author column into a stable list of display names."""
    authors: list[str] = []
    for item in parse_listish(value):
        if isinstance(item, dict):
            name = " ".join(str(item.get(k, "")).strip() for k in ("given", "family")).strip()
            if not name:
                name = str(item.get("name", "")).strip()
        else:
            name = str(item).strip()
        if name:
            authors.append(name)
    return authors


def parse_subjects(value: Any) -> list[str]:
    subjects: list[str] = []
    for item in parse_listish(value):
        text = str(item).strip()
        if text:
            subjects.append(text)
    return subjects


def safe_int(value: Any, default: int | None = None) -> int | None:
    try:
        if value is None or str(value).strip() == "":
            return default
        return int(float(str(value).strip()))
    except Exception:
        return default


def _first(row: dict[str, Any], *names: str) -> str:
    for name in names:
        if name in row and row[name] is not None and str(row[name]).strip() != "":
            return str(row[name])
    return ""


def load_articles_csv(path: str | Path) -> list[dict[str, Any]]:
    """Load article metadata from a CSV file.

    The loader accepts the corpus schema used in the SotA Lens case study and
    minimal CSV files containing only `doi`, `title`, and `references`.
    """
    rows: list[dict[str, Any]] = []
    with Path(path).open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for i, row in enumerate(reader):
            doi = normalize_doi(_first(row, "doi", "DOI", "id", "Id", "identifier"))
            if not doi:
                doi = f"row:{i}"
            rows.append(
                {
                    "doi": doi,
                    "title": (_first(row, "title", "Title", "label", "Label") or doi).strip(),
                    "authors": parse_authors(_first(row, "authors", "Authors", "author", "Author")),
                    "subjects": parse_subjects(_first(row, "subject", "subjects", "Subject", "Subjects", "keywords", "Keywords")),
                    "year": safe_int(_first(row, "year", "Year", "published", "publication_year")),
                    "url": _first(row, "link", "url", "URL", "uri", "URI").strip(),
                    "depth": safe_int(_first(row, "depth", "Depth", "search_depth"), default=0),
                    "references": parse_references(_first(row, "references", "References", "refs", "Refs")),
                }
            )
    return rows


def build_citation_graph(
    articles: Iterable[dict[str, Any]],
    *,
    include_external_references: bool = False,
    max_depth: int | None = None,
) -> nx.DiGraph:
    """Build a directed citation graph.

    Nodes represent publications. Edges point from a publication to the works it
    references. By default, references are added only when the target publication
    exists in the input corpus. Set `include_external_references=True` to include
    DOI-only reference nodes.
    """
    records = list(articles)
    graph = nx.DiGraph()
    known = {record["doi"] for record in records}

    for record in records:
        if max_depth is not None and record.get("depth", 0) is not None and record.get("depth", 0) > max_depth:
            continue
        graph.add_node(
            record["doi"],
            label=record.get("title") or record["doi"],
            title=record.get("title") or record["doi"],
            authors=json.dumps(record.get("authors", []), ensure_ascii=False),
            subjects=json.dumps(record.get("subjects", []), ensure_ascii=False),
            year=record.get("year") or "",
            url=record.get("url") or "",
            depth=record.get("depth") if record.get("depth") is not None else "",
        )

    for record in records:
        source = record["doi"]
        if source not in graph:
            continue
        for target in record.get("references", []):
            if target in known:
                if target in graph:
                    graph.add_edge(source, target)
            elif include_external_references:
                graph.add_node(target, label=target, title=target, external=True)
                graph.add_edge(source, target)
    return graph


def enrich_graph_from_csv(graph: nx.DiGraph, articles_csv: str | Path) -> nx.DiGraph:
    """Merge richer article metadata from CSV into an existing graph.

    This is useful when topology and/or visual layout come from a Gephi GEXF,
    but the article CSV contains fuller metadata such as authors, subjects,
    URLs, years, and search depth.
    """
    records = load_articles_csv(articles_csv)
    by_doi = {record["doi"]: record for record in records}

    for node, data in graph.nodes(data=True):
        key = normalize_doi(node) or str(node).strip().lower()
        record = by_doi.get(key)
        if not record:
            continue

        title = record.get("title") or data.get("title") or data.get("label") or str(node)
        data["label"] = title
        data["title"] = title
        data["authors"] = json.dumps(record.get("authors", []), ensure_ascii=False)
        data["subjects"] = json.dumps(record.get("subjects", []), ensure_ascii=False)
        data["year"] = record.get("year") or data.get("year") or ""
        data["url"] = record.get("url") or data.get("url") or ""
        data["depth"] = record.get("depth") if record.get("depth") is not None else data.get("depth", "")

    return graph


def author_ranking(graph: nx.Graph, limit: int = 25) -> list[tuple[str, int]]:
    counter: Counter[str] = Counter()
    for _, data in graph.nodes(data=True):
        for author in parse_authors(data.get("authors", "")):
            counter[author] += 1
    return counter.most_common(limit)


def subject_ranking(graph: nx.Graph, limit: int = 25) -> list[tuple[str, int]]:
    counter: Counter[str] = Counter()
    for _, data in graph.nodes(data=True):
        for subject in parse_subjects(data.get("subjects", "")):
            counter[subject] += 1
    return counter.most_common(limit)


def graph_summary(graph: nx.DiGraph) -> dict[str, Any]:
    undirected = graph.to_undirected()
    components = sorted((len(c) for c in nx.connected_components(undirected)), reverse=True) if graph else []
    return {
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "weak_components": nx.number_weakly_connected_components(graph) if graph else 0,
        "largest_component_nodes": components[0] if components else 0,
        "density": nx.density(graph) if graph.number_of_nodes() > 1 else 0,
        "top_authors": author_ranking(graph, 20),
        "top_subjects": subject_ranking(graph, 20),
    }


def _as_number(value: Any) -> float | None:
    try:
        number = float(value)
        if math.isfinite(number):
            return number
    except Exception:
        pass
    return None


def _community_map(display_graph: nx.DiGraph) -> dict[Any, int]:
    existing: dict[Any, int] = {}
    for node, data in display_graph.nodes(data=True):
        for key in ("community", "modularity_class", "modularity class", "modularity"):
            if key in data and data[key] not in (None, ""):
                parsed = safe_int(data[key])
                if parsed is not None:
                    existing[node] = parsed
                    break

    if len(set(existing.values())) > 1 and len(existing) >= max(1, int(0.25 * display_graph.number_of_nodes())):
        return existing

    community_map: dict[Any, int] = {}
    try:
        communities = nx.algorithms.community.greedy_modularity_communities(display_graph.to_undirected())
        for idx, community in enumerate(communities):
            for node in community:
                community_map[node] = idx
    except Exception:
        pass
    return community_map


def _layout_map(display_graph: nx.DiGraph) -> dict[Any, tuple[float, float]]:
    positions: dict[Any, tuple[float, float]] = {}
    for node, data in display_graph.nodes(data=True):
        x = _as_number(data.get("x"))
        y = _as_number(data.get("y"))
        if x is not None and y is not None and (x != 0 or y != 0):
            positions[node] = (x, y)

    if len(positions) >= max(1, int(0.25 * display_graph.number_of_nodes())):
        return positions

    if display_graph.number_of_nodes() == 0:
        return {}

    try:
        # Deterministic force-directed layout for the browser demo. This is only
        # applied when the GEXF does not already contain useful positions.
        layout = nx.spring_layout(display_graph.to_undirected(), seed=42, iterations=80, scale=950)
        return {node: (float(xy[0]), float(xy[1])) for node, xy in layout.items()}
    except Exception:
        return {}


def graph_to_web_dataset(graph: nx.DiGraph, *, limit: int | None = 500) -> dict[str, Any]:
    """Convert a NetworkX graph into a compact browser dataset."""
    if limit is not None and graph.number_of_nodes() > limit:
        degree = dict(graph.degree())
        selected = {node for node, _ in sorted(degree.items(), key=lambda item: item[1], reverse=True)[:limit]}
        display_graph = graph.subgraph(selected).copy()
    else:
        display_graph = graph.copy()

    degree = dict(graph.degree())
    community_map = _community_map(display_graph)
    positions = _layout_map(display_graph)

    nodes = []
    for node, data in display_graph.nodes(data=True):
        x, y = positions.get(node, (None, None))
        nodes.append(
            {
                "id": str(node),
                "label": str(data.get("label") or data.get("title") or node),
                "title": str(data.get("title") or data.get("label") or node),
                "authors": parse_authors(data.get("authors", "")),
                "subjects": parse_subjects(data.get("subjects", "")),
                "year": data.get("year") or "",
                "depth": data.get("depth") if data.get("depth") is not None else "",
                "degree": degree.get(node, 0),
                "community": community_map.get(node, 0),
                "url": data.get("url") or "",
                "x": x,
                "y": y,
            }
        )

    edges = [{"source": str(u), "target": str(v)} for u, v in display_graph.edges()]

    return {
        "metadata": {
            "full_nodes": graph.number_of_nodes(),
            "full_edges": graph.number_of_edges(),
            "display_nodes": len(nodes),
            "display_edges": len(edges),
        },
        "nodes": nodes,
        "edges": edges,
    }


def write_json(path: str | Path, data: Any) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def write_gexf(path: str | Path, graph: nx.DiGraph) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    nx.write_gexf(graph, path)


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def _children_named(element: ET.Element, local_name: str) -> list[ET.Element]:
    return [child for child in list(element) if _local_name(child.tag) == local_name]


def _first_descendant_named(element: ET.Element, local_name: str) -> ET.Element | None:
    for child in element.iter():
        if child is not element and _local_name(child.tag) == local_name:
            return child
    return None


def read_gexf(path: str | Path) -> nx.DiGraph:
    """Read a GEXF citation graph.

    NetworkX can read GEXF, but for large Gephi exports with long string
    attributes it can be slow. This lightweight reader handles the subset used
    by SotA Lens: node ids/labels, node attributes, optional viz positions and
    colours, and source/target edges.
    """
    root = ET.parse(path).getroot()
    graph_el = next((el for el in root.iter() if _local_name(el.tag) == "graph"), root)
    graph = nx.DiGraph()

    attr_names: dict[str, str] = {}
    for attributes_el in graph_el.iter():
        if _local_name(attributes_el.tag) != "attributes" or attributes_el.attrib.get("class") != "node":
            continue
        for attr in _children_named(attributes_el, "attribute"):
            attr_id = attr.attrib.get("id")
            title = attr.attrib.get("title") or attr.attrib.get("name") or attr_id or ""
            if attr_id:
                attr_names[attr_id] = title

    nodes_parent = next((el for el in graph_el.iter() if _local_name(el.tag) == "nodes"), None)
    if nodes_parent is not None:
        for index, node_el in enumerate(_children_named(nodes_parent, "node")):
            node_id = node_el.attrib.get("id") or f"node:{index}"
            label = node_el.attrib.get("label") or node_id
            data: dict[str, Any] = {"label": label, "title": label}

            attvalues_el = _first_descendant_named(node_el, "attvalues")
            if attvalues_el is not None:
                for av in _children_named(attvalues_el, "attvalue"):
                    raw_key = av.attrib.get("for") or av.attrib.get("id") or ""
                    value = av.attrib.get("value") or ""
                    if not raw_key:
                        continue
                    resolved = attr_names.get(raw_key, raw_key)
                    data[resolved] = value
                    data[resolved.lower()] = value

            pos_el = _first_descendant_named(node_el, "position")
            if pos_el is not None:
                if pos_el.attrib.get("x") is not None:
                    data["x"] = pos_el.attrib.get("x")
                if pos_el.attrib.get("y") is not None:
                    data["y"] = pos_el.attrib.get("y")

            color_el = _first_descendant_named(node_el, "color")
            if color_el is not None:
                if color_el.attrib.get("hex"):
                    data["viz_color"] = color_el.attrib.get("hex")
                elif all(color_el.attrib.get(k) is not None for k in ("r", "g", "b")):
                    data["viz_color"] = ",".join(color_el.attrib.get(k, "") for k in ("r", "g", "b"))

            graph.add_node(node_id, **data)

    edges_parent = next((el for el in graph_el.iter() if _local_name(el.tag) == "edges"), None)
    if edges_parent is not None:
        for edge_el in _children_named(edges_parent, "edge"):
            source = edge_el.attrib.get("source")
            target = edge_el.attrib.get("target")
            if source and target:
                graph.add_edge(source, target)

    return graph


def build_from_csv(
    articles_csv: str | Path,
    out_dir: str | Path,
    *,
    include_external_references: bool = False,
    max_depth: int | None = None,
    web_json: str | Path | None = None,
    web_limit: int = 500,
) -> dict[str, Any]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    articles = load_articles_csv(articles_csv)
    graph = build_citation_graph(
        articles,
        include_external_references=include_external_references,
        max_depth=max_depth,
    )
    summary = graph_summary(graph)
    write_gexf(out / "graph.gexf", graph)
    write_json(out / "summary.json", summary)
    if web_json:
        write_json(web_json, graph_to_web_dataset(graph, limit=web_limit))
    return summary
