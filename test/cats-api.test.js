import { html, fixture, expect } from '@open-wc/testing';
import "../cats-api.js";

describe("CatsApi test", () => {
  let element;
  beforeEach(async () => {
    element = await fixture(html`
      <cats-api
        title="title"
      ></cats-api>
    `);
  });

  it("basic will it blend", async () => {
    expect(element).to.exist;
  });

  it("passes the a11y audit", async () => {
    await expect(element).shadowDom.to.be.accessible();
  });
});
