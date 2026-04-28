---
title: "SotA Lens: Citation-network mapping for exploratory state-of-the-art reviews"
tags:
  - Python
  - literature review
  - citation networks
  - bibliometrics
  - scoping review
  - network science
authors:
  - name: Diogo Peralta Cordeiro
    orcid: 0000-0002-0260-5121
    affiliation: 1
    corresponding: true
affiliations:
  - name: Faculty of Engineering, University of Porto, Portugal
    index: 1
date: 28 April 2026
bibliography: paper.bib
---

# Summary

SotA Lens is an open-source toolkit for exploratory literature mapping through citation networks. It converts article metadata and reference lists into directed graphs, exports graph artifacts for tools such as Gephi [@bastian2009gephi], and provides a static browser-based explorer that can load CSV and GEXF files locally. The software is intended for the early stages of state-of-the-art reviews, scoping reviews, systematic mapping studies, and doctoral literature reviews, where researchers often need to understand the structure of a broad field before narrowing a formal protocol.

The project emerged from a review of Dynamic Projection-Mapping and Spatial Augmented Reality, a dispersed research area spanning projector-camera systems, computer vision, interaction design, mixed reality, cultural heritage, education, manufacturing, accessibility, and performance. In that case study, two broad seed queries produced approximately 200 seed records and a citation graph containing 2,198 publication nodes and 8,249 reference edges. SotA Lens packages that workflow as a reusable pipeline and public web explorer.

# Statement of need

Many reviews begin before a precise research question, stable vocabulary, or final eligibility scheme exists. This is especially common in interdisciplinary technical domains, where relevant work may be distributed across multiple terms, venues, methods, and application communities. At this stage, the researcher is not yet ready to perform a narrow systematic review; they first need to identify neighbouring terminology, influential works, active communities, and candidate scope boundaries.

Evidence-synthesis frameworks such as PRISMA 2020 [@page2021prisma] and PRISMA-ScR [@tricco2018prisma] provide essential reporting structures for systematic and scoping reviews. However, they are not designed to solve the upstream discovery problem by themselves. Systematic mapping studies are useful for classifying a literature once a corpus and classification scheme are stable [@petersen2015mapping], while narrative and critical reviews can synthesize broad ideas but are often harder to audit [@grant2009typology].

SotA Lens addresses this earlier exploratory phase. It does not replace manual screening, critical appraisal, PRISMA-style reporting, or domain expertise. Instead, it provides an auditable way to inspect a scholarly landscape as a citation graph before committing to a narrower review protocol. Its target users are researchers preparing state-of-the-art chapters, scoping studies, systematic maps, early-stage research proposals, and interdisciplinary surveys.

# State of the field

Several mature tools support bibliometric and science-mapping analysis. Bibliometrix provides a comprehensive R ecosystem for bibliometric workflows [@aria2017bibliometrix]. VOSviewer supports bibliometric network construction and visualization [@van2010vosviewer]. CiteSpace focuses on identifying emerging trends and transient patterns in scientific literature [@chen2006citespace]. Gephi provides a general-purpose platform for network exploration and visualization [@bastian2009gephi].

SotA Lens is complementary to these systems rather than a replacement. Its contribution is a lightweight review-oriented bridge between corpus preparation, citation-network construction, local inspection, and public dissemination. It emphasizes simple CSV ingestion, DOI-based graph construction, Gephi-compatible export, static browser-based exploration, and reproducible case-study packaging. This makes it suitable for researchers who do not primarily want a full bibliometric environment, but need a transparent way to move from broad search results to review artifacts that can be inspected, shared, and archived.

Compared with PRISMA-style methods, SotA Lens is positioned upstream: it helps define the field perimeter, vocabulary, and candidate communities. Compared with bibliometric platforms, it is smaller and more workflow-oriented: it is designed to support exploratory state-of-the-art review practice rather than comprehensive quantitative science mapping.

# Software design

SotA Lens is organized around two components: a Python command-line pipeline and a static web explorer.

The command-line pipeline reads article metadata from CSV files, normalizes DOI-based identifiers, extracts reference DOIs from common list-like encodings, constructs directed citation graphs with NetworkX [@hagberg2008networkx], computes summary statistics, and exports both Gephi-compatible GEXF files and browser-ready JSON. The pipeline deliberately treats metadata resolution, graph construction, and web export as separate steps so that intermediate artifacts can be inspected and versioned.

The static web explorer is designed for low-friction deployment. It requires no database, no server-side runtime, and no build system. Users can load local CSV and GEXF files directly in the browser, or explicitly open the bundled case study. This design avoids uploading provisional literature-review data to a server and makes it possible to host the tool through GitHub Pages or a simple static website.

The distributed version avoids live Google Scholar scraping. This is a deliberate reproducibility and maintenance decision: search-interface scraping is brittle and may conflict with service restrictions. Instead, SotA Lens supports imported seed tables, local/offline corpora, Crossref-style metadata workflows, and graph artifacts generated outside the browser. Crossref metadata is a useful source for DOI-level enrichment, but coverage limitations remain visible in the resulting corpus [@hendricks2020crossref].

# Research impact statement

SotA Lens has been used to support doctoral literature-review work on Dynamic Projection-Mapping and Spatial Augmented Reality. This case study demonstrates the intended use of the software in a broad, interdisciplinary technical domain. Starting from broad seed terms, the workflow produced a directed graph with 2,198 publication nodes and 8,249 reference edges. The resulting map helped identify recurring technical areas such as projector calibration, dynamic vision systems, dynamic image control, real-time tracking projection mapping, interactive projection mapping, non-rigid projection, human perception, and mixed-reality cues.

The same graph also exposed application-oriented communities, including museums and exhibitions, education, manufacturing, medicine, entertainment, accessibility, virtual try-on, robots, and multi-surface displays. These outputs were not treated as automatic evidence claims. Instead, they provided orientation: they helped identify vocabulary, candidate clusters, influential works, and areas requiring closer qualitative reading.

The repository includes the software, tests, documentation, static website, and bundled case-study artifacts. This provides a reproducible demonstration of the tool’s intended research workflow and makes the case study inspectable by reviewers and future users.

# Limitations

SotA Lens is an exploratory tool. It should not be used as a substitute for formal inclusion/exclusion criteria, quality appraisal, or transparent reporting when making final evidence claims. The method is also sensitive to seed queries, metadata coverage, DOI availability, and citation-depth choices. Author and affiliation rankings require caution because name disambiguation is imperfect. Community detection should be interpreted as a cue for human review, not as a definitive classification of the field.

# AI usage disclosure

Generative AI assistance was used during repository refactoring, documentation drafting, website copy-editing, test scaffolding, and manuscript editing. The author reviewed, edited, and validated the generated material; selected the scholarly framing; made the core design decisions; checked the repository contents; and remains fully responsible for the accuracy, originality, licensing, and ethical compliance of the submitted work.

# Acknowledgements

This work was developed in the context of doctoral research at the Faculty of Engineering of the University of Porto. The bundled Dynamic Projection-Mapping / Spatial Augmented Reality case study derives from literature-review work conducted within that research programme.

# References
