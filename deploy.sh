#!/usr/bin/env sh

# abort on errors
set -e

# build
npm run build

# copy all necessary files to dist folder
cp -r views dist
cp -r css dist
cp -r data dist
cp index.html dist

# navigate into the build output directory
cd dist
mkdir dist
cp bundle.js dist

# if you are deploying to a custom domain
# echo 'blog.boristane.com' > CNAME

git init
git add -A
git commit -m 'deploy'

# if you are deploying to https://<USERNAME>.github.io
# git push -f git@github.com:<USERNAME>/<USERNAME>.github.io.git master

# if you are deploying to https://<USERNAME>.github.io/<REPO>
git push -f https://github.com/boristane/parliament.git master:gh-pages

cd -