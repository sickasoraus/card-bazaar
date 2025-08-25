const { fetchCardImages, cardNames } = require('../fetchCardImages');

describe('fetchCardImages', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="cardGrid"></div>';
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({ image_uris: { normal: 'test-image.png' } })
      })
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('adds one card per name', async () => {
    await fetchCardImages();
    const grid = document.getElementById('cardGrid');
    expect(grid.children).toHaveLength(cardNames.length);
  });
});
