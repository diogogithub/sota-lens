TEX=main
BIBTEX ?= bibtex

all: $(TEX).pdf

$(TEX).pdf: $(TEX).tex references.bib figures/map_of_field.pdf figures/sota_article_net.png
	pdflatex -interaction=nonstopmode $(TEX).tex
	$(BIBTEX) $(TEX)
	pdflatex -interaction=nonstopmode $(TEX).tex
	pdflatex -interaction=nonstopmode $(TEX).tex

clean:
	rm -f $(TEX).aux $(TEX).bbl $(TEX).blg $(TEX).log $(TEX).out $(TEX).toc $(TEX).fls $(TEX).fdb_latexmk

distclean: clean
	rm -f $(TEX).pdf
