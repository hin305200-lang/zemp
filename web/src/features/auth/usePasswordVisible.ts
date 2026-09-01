import { useState } from "react";

export function usePasswordVisible() {
  const [show, setShow] = useState(false);
  return {
    show,
    inputType: show ? "text" : "password",
    toggle: () => {
      setShow((value) => !value);
    },
  };
}
