To debug:
npm run start

To build
# If cards haven't changed, skip all steps except the last

# generate the latest card images.
node ./cardTransformer.js -d

# Upload the cards
* In a browser go to playiongcards.io > custom room > start blank room
* Click "Edit table" (briefcase icon)
* Custom card deck > Cards
* Scroll down and click "Remove Everything"
* "Add new card" > "Upload Image(s)"
* //TableTop/AdventurerFactory/generated and select all pngs
* After upload, click "Export to CSV File" and save as //TableTop/AdventurerFactory/editor/index.csv
# Now when you generated a deck with the editor, you can save it as a csv and import the correct images to the playingcards.io room.

# build them into the latest editor
npx electron-packager . JoelsDeckBuilder --platform=win32 --arch=x64 --overwrite