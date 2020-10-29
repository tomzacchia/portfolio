#! /bin/sh
echo "Pushing build to gh-pages subtree"
git subtree push --prefix $1 origin gh-pages