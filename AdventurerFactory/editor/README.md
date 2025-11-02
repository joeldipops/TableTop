To debug:
npm run start

To build
# generate the latest card images.
node ./cardTransformer.js -d
# build them into the latest editor
npx electron-packager . JoelsDeckBuilder --platform=win32 --arch=x64 --overwrite