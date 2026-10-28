import {
  sanitizeInput,
  sanitizeForUrl,
  sanitizeHtml,
  validateInputLength
} from "@/utils/inputSanitizer";

describe("Input Sanitization", () => {
  test("sanitizes basic HTML tags in strings", () => {
    const input = '<script>alert("xss")</script>Hello';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe("Hello");
    expect(sanitized).not.toContain("<script>");
  });

  test("converts dangerous entities", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe("");
    expect(sanitized).not.toContain("<");
  });

  test("handles arrays of strings", () => {
    const input = ["<script>bad</script>", "normal text"];
    const sanitized = input.map(sanitizeInput);
    expect(sanitized).toEqual(["", "normal text"]);
  });

  test("sanitizes objects recursively", () => {
    const input = {
      name: '<script>alert("x")</script>',
      email: "test@example.com",
      nested: { password: "<script>evil</script>" }
    };
    const sanitized = sanitizeInput(input);
    expect(sanitized.name).toBe("");
    expect(sanitized.nested.password).toBe("");
  });

  test("sanitizes URLs to allowed protocols", () => {
    const httpUrl = sanitizeForUrl("http://example.com");
    expect(httpUrl).toBe("http://example.com");

    const javascriptUrl = sanitizeForUrl('javascript:alert("xss")');
    expect(javascriptUrl).toBe("");
  });

  test("sanitizes HTML content for safe display", () => {
    const html = "<div onclick=\"alert('xss')\">Content</div>";
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toBe("<div>Content</div>");
    expect(sanitized).not.toContain("onclick");
  });

  test("validates input length", () => {
    expect(validateInputLength("short", 10)).toBe(true);
    expect(validateInputLength("this is way too long", 10)).toBe(false);
  });
});
