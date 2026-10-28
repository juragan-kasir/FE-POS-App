import React from "react";
import { render, screen, act } from "@testing-library/react";
import FaqChat, { FAQ_CHAT_OPEN } from "@/components/organism/FaqChat";

// The Support page's "Start chat" button had no handler. It now dispatches
// FAQ_CHAT_OPEN, which opens the globally mounted FAQ chat panel.

jest.mock("@/services/faq", () => ({ searchFaq: jest.fn(), askAi: jest.fn() }));

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

test("the open event shows the chat panel", () => {
  render(<FaqChat />);
  expect(screen.queryByText("FAQ Chat")).toBeNull();
  act(() => {
    window.dispatchEvent(new Event(FAQ_CHAT_OPEN));
  });
  expect(screen.getByText("FAQ Chat")).toBeTruthy();
});
