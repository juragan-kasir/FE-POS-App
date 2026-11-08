import { orderList } from "../state/order-list";
import { buildOrderItemsPayload } from "../utils/orderPayload";
import { breakPriceFor, quantityBreaksOf, lineTotalOf } from "../utils/quantityPrice";

// Retail R1 (2026-11-08): grosir quantity breaks keep the cart in step with
// the server, so the expectedPrice echo never trips a PRICE_CHANGED 409.
const TIERS = [
  { id: "t1", name: "Grosir 12", price: 9000, minQty: 12 },
  { id: "t2", name: "Grosir 48", price: 8500, minQty: 48 },
  { id: "t3", name: "Harga Member", price: 9500 }
];

const product = {
  id: 7,
  nameProduct: "Gula 1 kg",
  price: 10000,
  priceAuthoritative: true,
  priceTiers: TIERS
};

const line = () => orderList.getState().order[0];

describe("quantity price helpers", () => {
  test("only tiers with a positive minQty are breaks, sorted", () => {
    expect(quantityBreaksOf(TIERS)).toEqual([
      { minQty: 12, price: 9000 },
      { minQty: 48, price: 8500 }
    ]);
    expect(quantityBreaksOf(null)).toEqual([]);
  });

  test("the highest qualifying break wins", () => {
    const breaks = quantityBreaksOf(TIERS);
    expect(breakPriceFor(breaks, 11)).toBeNull();
    expect(breakPriceFor(breaks, 12)).toBe(9000);
    expect(breakPriceFor(breaks, 60)).toBe(8500);
  });

  test("a line total rounds to the nearest rupiah", () => {
    expect(lineTotalOf(12345, 0.5)).toBe(6173);
  });
});

describe("order-list store: quantity breaks", () => {
  beforeEach(() => orderList.setState({ order: [] }));

  test("the unit price follows the break as the count changes", () => {
    orderList.getState().addOrder(product);
    expect(line().price).toBe(10000);
    for (let i = 1; i < 12; i++) orderList.getState().incrementOrder(line());
    expect(line().count).toBe(12);
    expect(line().price).toBe(9000);
    expect(line().totalPrice).toBe(108000);
    orderList.getState().decrementOrder(line());
    expect(line().price).toBe(10000);
    expect(line().totalPrice).toBe(110000);
  });

  test("re-adding the same product also re-prices", () => {
    for (let i = 0; i < 12; i++) orderList.getState().addOrder(product);
    expect(line().count).toBe(12);
    expect(line().price).toBe(9000);
  });

  test("option markup stays on top of the break price", () => {
    const variant = {
      ...product,
      price: 10500,
      catalogUnitPrice: 10000,
      selectedOptions: [{ name: "Plastik" }]
    };
    orderList.getState().addOrder(variant);
    for (let i = 1; i < 12; i++) orderList.getState().incrementOrder(line());
    expect(line().price).toBe(9500);
  });

  test("checkout echoes the break price as expectedPrice", () => {
    orderList.getState().addOrder(product);
    for (let i = 1; i < 12; i++) orderList.getState().incrementOrder(line());
    const [item] = buildOrderItemsPayload(orderList.getState().order);
    expect(item.quantity).toBe(12);
    expect(item.expectedPrice).toBe(9000);
  });

  test("an overridden price is never re-priced by a break", () => {
    orderList.getState().addOrder(product);
    orderList.getState().updateItemPrice(line(), 7000);
    for (let i = 1; i < 12; i++) orderList.getState().incrementOrder(line());
    expect(line().price).toBe(7000);
    expect(line().totalPrice).toBe(84000);
  });

  test("a product without breaks keeps its plain behaviour", () => {
    orderList.getState().addOrder({ ...product, priceTiers: [] });
    orderList.getState().incrementOrder(line());
    expect(line().price).toBe(10000);
    expect(line().totalPrice).toBe(20000);
    expect(line().quantityBreaks).toBeUndefined();
  });
});

describe("order-list store: sell by weight (retail R1)", () => {
  beforeEach(() => orderList.setState({ order: [] }));

  const weighed = {
    id: 9,
    nameProduct: "Daging",
    price: 12345,
    unit: "kg",
    allowDecimalQty: true,
    priceAuthoritative: true
  };

  test("a weighed line takes a typed fraction and rounds the total to the rupiah", () => {
    orderList.getState().addOrder(weighed);
    orderList.getState().setQuantity(line(), 0.5);
    expect(line().count).toBe(0.5);
    expect(line().totalPrice).toBe(6173);
    const [item] = buildOrderItemsPayload(orderList.getState().order);
    expect(item.quantity).toBe(0.5);
    expect(item.expectedPrice).toBe(12345);
  });

  test("a whole-unit line rounds a typed fraction to whole units", () => {
    orderList.getState().addOrder(product);
    orderList.getState().setQuantity(line(), 2.4);
    expect(line().count).toBe(2);
  });

  test("zero or garbage leaves the line unchanged", () => {
    orderList.getState().addOrder(weighed);
    orderList.getState().setQuantity(line(), 0);
    orderList.getState().setQuantity(line(), "abc");
    expect(line().count).toBe(1);
  });
});

describe("quantity input parsing", () => {
  test("accepts a comma or a dot and keeps three decimals for weighed lines", async () => {
    const { parseQuantityInput, formatQuantity } = await import("../utils/quantityPrice");
    expect(parseQuantityInput("0,75", true)).toBe(0.75);
    expect(parseQuantityInput("1.2345", true)).toBe(1.235);
    expect(parseQuantityInput("1,5", false)).toBe(2);
    expect(parseQuantityInput("abc", true)).toBeNull();
    expect(formatQuantity(0.75)).toBe("0,75");
  });
});
