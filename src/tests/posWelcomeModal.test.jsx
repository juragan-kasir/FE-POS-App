import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PosWelcomeModal from "@/components/organism/PosWelcomeModal";

// ponytail: jsdom tidak punya ResizeObserver yang dibutuhkan Radix Dialog
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!window.ResizeObserver) window.ResizeObserver = ResizeObserverStub;

describe("PosWelcomeModal", () => {
  test("menampilkan sambutan dan tiga langkah onboarding", () => {
    render(<PosWelcomeModal open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByText(/Selamat Datang di juragankasir\.com!/)).toBeTruthy();
    expect(screen.getByText(/Mari mulai transaksi pertama Anda/)).toBeTruthy();
    expect(screen.getByText("Keranjang Pesanan")).toBeTruthy();
    expect(screen.getByText("Daftar Produk")).toBeTruthy();
    expect(screen.getByText("Pembayaran")).toBeTruthy();
  });

  test("tombol Mulai Gunakan memanggil onOpenChange(false)", () => {
    const onOpenChange = jest.fn();
    render(<PosWelcomeModal open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByTestId("pos-welcome-cta"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("tidak merender apa pun saat open=false", () => {
    render(<PosWelcomeModal open={false} onOpenChange={jest.fn()} />);
    expect(screen.queryByText(/Selamat Datang di juragankasir\.com!/)).toBeNull();
  });
});
