# Museum of Art History

A zoomable timeline of art history with a walkable 3D gallery per artist. Every bio, date, painting, story and fact comes from Wikipedia, Wikidata and Wikimedia Commons. Nothing is generated.

## Deploy without installing anything

1. Create a Neon project at neon.tech and copy the connection string.
2. Create a new GitHub repository and upload this folder (drag and drop the files in the browser).
3. In Vercel, choose New Project, import the repository, and add two environment variables:
   `DATABASE_URL` (the Neon string) and `SEED_SECRET` (any long random string). Deploy.
4. Open `https://your-app.vercel.app/seed`, paste the secret, click Seed. It takes 5 to 10 minutes and shows a line per artist.
5. Open the timeline.

## QA with Playwright, also without installing anything

In the GitHub repository go to Settings, Secrets and variables, Actions, and add `BASE_URL` = your Vercel URL.
Then Actions, "QA deployed site", Run workflow. The report is attached to the run.

## Or from a laptop

    npm install
    cp .env.example .env.local        # fill in DATABASE_URL and SEED_SECRET
    npm run seed                      # or use /seed in the browser
    npm run dev
    BASE_URL=https://your-app.vercel.app npm run qa

## Notes

- Periods before 1930 fill up easily with public-domain images. Cubism onwards (Picasso, Dalí, Pollock, Warhol, Basquiat and so on) is still under copyright, so Commons has few or no images and those galleries will be thin. The seeder says so per artist.
- The catalog in `lib/catalog.ts` is only a list of Wikipedia article titles. Add or remove artists there and re-run the seeder.
- Wikipedia extracts are shown verbatim and each card links to its source.
