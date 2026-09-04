// The catalog is a SELECTION of Wikipedia article titles, nothing more.
// Dates, bios, portraits, paintings, stories and facts are all fetched from
// Wikipedia and Wikidata at seed time. If Wikipedia has no article for a title
// the seeder skips it and says so.

export type CatalogPeriod = {
  slug: string;
  name: string;
  wikiTitle: string;      // English Wikipedia article for the period
  start: number;          // display range for the timeline band
  end: number;
  artists: string[];      // English Wikipedia article titles
};

export const CATALOG: CatalogPeriod[] = [
  { slug: 'medieval-gothic', name: 'Medieval and Gothic', wikiTitle: 'Gothic art', start: 1240, end: 1420,
    artists: ['Giotto', 'Duccio', 'Simone Martini', 'Cimabue'] },
  { slug: 'early-renaissance', name: 'Early Renaissance', wikiTitle: 'Early Renaissance', start: 1400, end: 1495,
    artists: ['Fra Angelico', 'Sandro Botticelli', 'Jan van Eyck', 'Piero della Francesca'] },
  { slug: 'high-renaissance', name: 'High Renaissance', wikiTitle: 'High Renaissance', start: 1490, end: 1530,
    artists: ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Titian'] },
  { slug: 'northern-mannerism', name: 'Northern Renaissance and Mannerism', wikiTitle: 'Mannerism', start: 1500, end: 1610,
    artists: ['Hieronymus Bosch', 'Pieter Bruegel the Elder', 'El Greco', 'Hans Holbein the Younger'] },
  { slug: 'baroque', name: 'Baroque', wikiTitle: 'Baroque painting', start: 1600, end: 1720,
    artists: ['Caravaggio', 'Rembrandt', 'Johannes Vermeer', 'Peter Paul Rubens', 'Diego Velázquez'] },
  { slug: 'rococo', name: 'Rococo', wikiTitle: 'Rococo', start: 1715, end: 1785,
    artists: ['Antoine Watteau', 'François Boucher', 'Jean-Honoré Fragonard'] },
  { slug: 'neoclassicism', name: 'Neoclassicism', wikiTitle: 'Neoclassicism', start: 1765, end: 1835,
    artists: ['Jacques-Louis David', 'Jean-Auguste-Dominique Ingres', 'Angelica Kauffman'] },
  { slug: 'romanticism', name: 'Romanticism', wikiTitle: 'Romanticism', start: 1795, end: 1855,
    artists: ['J. M. W. Turner', 'Eugène Delacroix', 'Caspar David Friedrich', 'Francisco Goya'] },
  { slug: 'realism', name: 'Realism', wikiTitle: 'Realism (art movement)', start: 1840, end: 1885,
    artists: ['Gustave Courbet', 'Jean-François Millet', 'Édouard Manet'] },
  { slug: 'impressionism', name: 'Impressionism', wikiTitle: 'Impressionism', start: 1865, end: 1900,
    artists: ['Claude Monet', 'Pierre-Auguste Renoir', 'Edgar Degas', 'Berthe Morisot'] },
  { slug: 'post-impressionism', name: 'Post-Impressionism', wikiTitle: 'Post-Impressionism', start: 1885, end: 1912,
    artists: ['Vincent van Gogh', 'Paul Cézanne', 'Paul Gauguin', 'Georges Seurat'] },
  { slug: 'expressionism', name: 'Expressionism', wikiTitle: 'Expressionism', start: 1900, end: 1935,
    artists: ['Edvard Munch', 'Ernst Ludwig Kirchner', 'Wassily Kandinsky', 'Egon Schiele'] },
  { slug: 'cubism', name: 'Cubism', wikiTitle: 'Cubism', start: 1907, end: 1930,
    artists: ['Juan Gris', 'Pablo Picasso', 'Georges Braque'] },
  { slug: 'surrealism', name: 'Surrealism', wikiTitle: 'Surrealism', start: 1924, end: 1955,
    artists: ['Salvador Dalí', 'René Magritte', 'Max Ernst'] },
  { slug: 'abstract-expressionism', name: 'Abstract Expressionism', wikiTitle: 'Abstract expressionism', start: 1943, end: 1968,
    artists: ['Jackson Pollock', 'Mark Rothko', 'Willem de Kooning'] },
  { slug: 'pop-art', name: 'Pop Art', wikiTitle: 'Pop art', start: 1955, end: 1978,
    artists: ['Andy Warhol', 'Roy Lichtenstein', 'David Hockney'] },
  { slug: 'contemporary', name: 'Contemporary', wikiTitle: 'Contemporary art', start: 1975, end: 2025,
    artists: ['Jean-Michel Basquiat', 'Yayoi Kusama', 'Gerhard Richter'] },
];

export const ALL_ARTISTS = CATALOG.flatMap(p => p.artists.map(a => ({ period: p.slug, title: a })));
