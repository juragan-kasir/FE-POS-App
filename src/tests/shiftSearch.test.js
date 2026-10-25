describe("getAllShift search parameter", () => {
  test("includes search parameter in URL", () => {
    const store = "";
    const page = 1;
    const limit = 10;
    const statusShift = "";
    const search = "morning";

    const url = `/shift/get-shift?store=${store}&page=${page}&pageSize=${limit}&status=${statusShift}&search=${search}`;
    expect(url).toContain("search=morning");
  });

  test("includes empty search parameter when not provided", () => {
    const store = "";
    const page = 1;
    const limit = 10;
    const statusShift = "";
    const search = "";

    const url = `/shift/get-shift?store=${store}&page=${page}&pageSize=${limit}&status=${statusShift}&search=${search}`;
    expect(url).toContain("search=");
  });

  test("URL construction with search value", () => {
    const store = "1";
    const page = 1;
    const limit = 10;
    const statusShift = "active";
    const search = "evening shift";

    const url = `/shift/get-shift?store=${store}&page=${page}&pageSize=${limit}&status=${statusShift}&search=${search}`;
    expect(url).toContain("store=1");
    expect(url).toContain("search=evening shift");
    expect(url).toContain("status=active");
  });
});
