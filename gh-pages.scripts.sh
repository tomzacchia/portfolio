#! /bin/sh
# https://gist.github.com/cobyism/4730490
echo "Pushing build to gh-pages subtree"
git subtree push --prefix dist origin gh-pages