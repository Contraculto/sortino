# Sortino

Browser based app for sorting images into directories.

**Node.js:**

Make sure you download and install Node.js from https://nodejs.org/ or using your favorite package manager.

**Install Sortino with:**

npm install -g sortino

**Run Sortino with:**

sortino

**Usage:**

When run, the program will create a local web server listening to http://localhost:1234

Visiting http://localhost:1234/settings will take you to a settings page where you can set the port for the web server, the source directory and the destination directory.

The source should contain only lose images. Supported formats haven’t been really tested.

The destination should contain directories where the images will be placed, for each one of them, an item will be created in the app’s menu.

Head back to http://localhost:1234 (or whatever port you defined) and get to sorting. The app will load the first image from source. Click on any of the items from the menu to move the image to that folder and load the next one.

**More information:**

For code, comments, feedback or anything else, go to https://github.com/Contraculto/sortino