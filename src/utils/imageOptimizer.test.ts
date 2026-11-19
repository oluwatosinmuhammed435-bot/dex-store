import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAspectRatioFit,
  DEFAULT_WEBP_QUALITY,
  MAX_CANVAS_DIMENSION,
  VARIANT_SPECS,
} from './imageOptimizer';

test('calculateAspectRatioFit correctly scales down landscape image while preserving aspect ratio', () => {
  // 2000x1000 (2:1 aspect ratio) resized to max 1200
  const dims = calculateAspectRatioFit(2000, 1000, 1200);
  assert.equal(dims.width, 1200);
  assert.equal(dims.height, 600);
});

test('calculateAspectRatioFit correctly scales down portrait image while preserving aspect ratio', () => {
  // 1000x2000 (1:2 aspect ratio) resized to max 800
  const dims = calculateAspectRatioFit(1000, 2000, 800);
  assert.equal(dims.height, 800);
  assert.equal(dims.width, 400);
});

test('calculateAspectRatioFit correctly scales square images', () => {
  // 1600x1600 square image resized to max 400
  const dims = calculateAspectRatioFit(1600, 1600, 400);
  assert.equal(dims.width, 400);
  assert.equal(dims.height, 400);
});

test('calculateAspectRatioFit does not upscale images already smaller than maxDimension', () => {
  // 300x200 image with maxDimension 800 should remain 300x200
  const dims = calculateAspectRatioFit(300, 200, 800);
  assert.equal(dims.width, 300);
  assert.equal(dims.height, 200);
});

test('calculateAspectRatioFit matches exact responsive target dimensions', () => {
  // Testing with an 4000x3000 (4:3) camera photo
  const thumb = calculateAspectRatioFit(4000, 3000, VARIANT_SPECS.thumbnail.maxDimension);
  assert.equal(thumb.width, 200);
  assert.equal(thumb.height, 150);

  const card = calculateAspectRatioFit(4000, 3000, VARIANT_SPECS.card.maxDimension);
  assert.equal(card.width, 400);
  assert.equal(card.height, 300);

  const detail = calculateAspectRatioFit(4000, 3000, VARIANT_SPECS.detail.maxDimension);
  assert.equal(detail.width, 800);
  assert.equal(detail.height, 600);

  const full = calculateAspectRatioFit(4000, 3000, VARIANT_SPECS.full.maxDimension);
  assert.equal(full.width, 1200);
  assert.equal(full.height, 900);
});

test('calculateAspectRatioFit throws on non-positive or invalid dimensions', () => {
  assert.throws(() => calculateAspectRatioFit(0, 500, 1200));
  assert.throws(() => calculateAspectRatioFit(-100, 500, 1200));
  assert.throws(() => calculateAspectRatioFit(500, -100, 1200));
});

test('constants match performance specifications', () => {
  assert.equal(DEFAULT_WEBP_QUALITY, 0.82);
  assert.equal(MAX_CANVAS_DIMENSION, 1200);
  assert.equal(VARIANT_SPECS.thumbnail.maxDimension, 200);
  assert.equal(VARIANT_SPECS.card.maxDimension, 400);
  assert.equal(VARIANT_SPECS.detail.maxDimension, 800);
});
