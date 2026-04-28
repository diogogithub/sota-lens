from pathlib import Path

import networkx as nx

from sota_lens.pipeline import (
    build_citation_graph,
    build_from_csv,
    enrich_graph_from_csv,
    graph_summary,
    graph_to_web_dataset,
    load_articles_csv,
    normalize_doi,
    parse_references,
    read_gexf,
)


def test_normalize_doi_extracts_embedded_doi():
    assert normalize_doi("https://doi.org/10.1145/123.456.") == "10.1145/123.456"


def test_parse_references_accepts_dict_list():
    refs = parse_references("[{'doi': '10.1000/ABC'}, {'DOI': '10.2000/def'}]")
    assert refs == ["10.1000/abc", "10.2000/def"]


def test_build_graph_from_minimal_csv(tmp_path: Path):
    csv_path = tmp_path / "articles.csv"
    csv_path.write_text(
        "doi,title,authors,year,references\n"
        "10.1/a,Paper A,\"['Ana A']\",2020,\"[{'doi': '10.1/b'}]\"\n"
        "10.1/b,Paper B,\"['Ben B']\",2019,\"[]\"\n",
        encoding="utf-8",
    )

    articles = load_articles_csv(csv_path)
    graph = build_citation_graph(articles)

    assert graph.number_of_nodes() == 2
    assert graph.number_of_edges() == 1
    assert graph.has_edge("10.1/a", "10.1/b")


def test_build_from_csv_writes_outputs(tmp_path: Path):
    csv_path = tmp_path / "articles.csv"
    out_dir = tmp_path / "out"
    web_json = tmp_path / "web.json"
    csv_path.write_text(
        "doi,title,references\n"
        "10.1/a,Paper A,\"10.1/b\"\n"
        "10.1/b,Paper B,\"\"\n",
        encoding="utf-8",
    )

    summary = build_from_csv(csv_path, out_dir, web_json=web_json)

    assert summary["nodes"] == 2
    assert (out_dir / "graph.gexf").exists()
    assert (out_dir / "summary.json").exists()
    assert web_json.exists()


def test_web_dataset_has_rich_node_metadata_and_edges():
    graph = nx.DiGraph()
    graph.add_node("a", label="A", title="A", authors='["Ana A"]', subjects='["HCI"]', year=2020, x=1, y=2)
    graph.add_node("b", label="B", title="B", authors='["Ben B"]', subjects='["XR"]', year=2019, x=3, y=4)
    graph.add_edge("a", "b")

    dataset = graph_to_web_dataset(graph)

    assert dataset["metadata"]["full_nodes"] == 2
    assert len(dataset["nodes"]) == 2
    assert len(dataset["edges"]) == 1
    node_a = next(node for node in dataset["nodes"] if node["id"] == "a")
    assert node_a["authors"] == ["Ana A"]
    assert node_a["subjects"] == ["HCI"]
    assert node_a["x"] == 1
    assert node_a["y"] == 2


def test_enrich_graph_from_csv_merges_article_metadata(tmp_path: Path):
    csv_path = tmp_path / "articles.csv"
    csv_path.write_text(
        "doi,title,authors,subject,year,link,depth,references\n"
        "10.1/a,Paper A,\"['Ana A']\",\"['HCI']\",2020,https://example.org/a,0,\"[]\"\n",
        encoding="utf-8",
    )

    graph = nx.DiGraph()
    graph.add_node("10.1/a", label="Old label")
    enrich_graph_from_csv(graph, csv_path)

    data = graph.nodes["10.1/a"]
    assert data["title"] == "Paper A"
    assert data["url"] == "https://example.org/a"
    assert data["year"] == 2020


def test_read_gexf_reads_node_attributes_and_edges(tmp_path: Path):
    gexf = tmp_path / "graph.gexf"
    gexf.write_text(
        """<?xml version='1.0' encoding='utf-8'?>
<gexf xmlns='http://www.gexf.net/1.2draft' version='1.2'>
  <graph defaultedgetype='directed' mode='static'>
    <attributes class='node' mode='static'>
      <attribute id='0' title='year' type='integer' />
    </attributes>
    <nodes>
      <node id='10.1/a' label='Paper A'><attvalues><attvalue for='0' value='2020' /></attvalues></node>
      <node id='10.1/b' label='Paper B' />
    </nodes>
    <edges><edge id='0' source='10.1/a' target='10.1/b' /></edges>
  </graph>
</gexf>
""",
        encoding="utf-8",
    )
    graph = read_gexf(gexf)
    assert graph.number_of_nodes() == 2
    assert graph.number_of_edges() == 1
    assert graph.nodes["10.1/a"]["year"] == "2020"
