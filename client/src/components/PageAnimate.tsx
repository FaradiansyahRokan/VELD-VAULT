"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext, useRef, useState, useEffect } from "react";

// Urutan Halaman
const routes: Record<string, number> = {
  "/": 0,
  "/vault": 1,
  "/market": 2
};

function FrozenRouter(props: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext ?? {});
  const frozen = useRef(context).current;
  return (
    <LayoutRouterContext.Provider value={frozen}>
      {props.children}
    </LayoutRouterContext.Provider>
  );
}

export default function PageAnimate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const index = routes[pathname] ?? 0;

  // TEKNIK TUPLE STATE [IndexSekarang, Arah]
  // Ini kebal terhadap re-render data (polling)
  const [[page, direction], setPage] = useState([index, 0]);

  useEffect(() => {
    // Hanya update state jika index halaman BENAR-BENAR berubah
    if (index !== page) {
      const dir = index > page ? 1 : -1;
      setPage([index, dir]);
    }
  }, [index, page]);

  // Varian Animasi iOS Smooth
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%", // Masuk dari samping full
      opacity: 0,
      scale: 1, // Jangan scale down biar gak flicker
      zIndex: 1,
      position: "absolute" as const, // Kunci: Absolute saat masuk biar gak dorong layout
      top: 0,
      width: "100%"
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 1,
      position: "absolute" as const, // Selalu absolute biar konsisten viewportnya
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-25%" : "25%", // Efek Parallax halus
      opacity: 0,
      scale: 0.95, // Mundur sedikit ke belakang
      zIndex: 0,
      filter: "blur(4px)",
      position: "absolute" as const, // Absolute saat keluar
      top: 0,
      width: "100%",
      height: "100%",
    }),
  };

  return (
    // Gunakan 'popLayout' agar scrollbar tidak loncat
    <AnimatePresence mode="popLayout" custom={direction} initial={false}>
      <motion.div
        key={pathname}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 280, damping: 32, mass: 1 }, // Tuning Physics: Sedikit lebih berat biar mewah
          opacity: { duration: 0.3 },
          scale: { duration: 0.35 }
        }}
        className="absolute inset-0 w-full h-[100dvh] overflow-y-auto overflow-x-hidden will-change-transform"
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}