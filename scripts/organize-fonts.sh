#!/bin/bash

# Script to organize converted fonts into website/public/fonts structure

echo "🔤 Organizing fonts for website..."

# Create directory structure
mkdir -p website/public/fonts/aeonik
mkdir -p website/public/fonts/aeonik-fono
mkdir -p website/public/fonts/pp-fragment

# Copy Aeonik fonts (Regular, Medium, Bold)
echo "📦 Copying Aeonik fonts..."
cp "Fonts/transfonter.org-20260423-155500/Aeonik-Regular.woff" website/public/fonts/aeonik/
cp "Fonts/transfonter.org-20260423-155500/Aeonik-Regular.woff2" website/public/fonts/aeonik/
cp "Fonts/transfonter.org-20260423-155500/Aeonik-Medium.woff" website/public/fonts/aeonik/
cp "Fonts/transfonter.org-20260423-155500/Aeonik-Medium.woff2" website/public/fonts/aeonik/
cp "Fonts/transfonter.org-20260423-155500/Aeonik-Bold.woff" website/public/fonts/aeonik/
cp "Fonts/transfonter.org-20260423-155500/Aeonik-Bold.woff2" website/public/fonts/aeonik/

# Copy Aeonik Fono (monospace)
echo "📦 Copying Aeonik Fono fonts..."
cp "Fonts/transfonter.org-20260423-155206/AeonikFono-Regular.woff" website/public/fonts/aeonik-fono/
cp "Fonts/transfonter.org-20260423-155206/AeonikFono-Regular.woff2" website/public/fonts/aeonik-fono/

# Copy PP Fragment Serif fonts
echo "📦 Copying PP Fragment Serif fonts..."
cp "Fonts/transfonter.org-20260423-155500/PPFragment-SerifRegular.woff" website/public/fonts/pp-fragment/
cp "Fonts/transfonter.org-20260423-155500/PPFragment-SerifRegular.woff2" website/public/fonts/pp-fragment/
cp "Fonts/transfonter.org-20260423-155500/PPFragment-SerifExtraBold.woff" website/public/fonts/pp-fragment/
cp "Fonts/transfonter.org-20260423-155500/PPFragment-SerifExtraBold.woff2" website/public/fonts/pp-fragment/

echo "✅ Fonts organized successfully!"
echo ""
echo "Font locations:"
echo "  - Aeonik: website/public/fonts/aeonik/"
echo "  - Aeonik Fono: website/public/fonts/aeonik-fono/"
echo "  - PP Fragment: website/public/fonts/pp-fragment/"
