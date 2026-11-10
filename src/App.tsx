import { NavigationProvider } from "./nav";
import { Shell } from "./Shell";
import { StoreProvider } from "./store";

export function App() {
  return (
    <StoreProvider>
      <NavigationProvider>
        <Shell />
      </NavigationProvider>
    </StoreProvider>
  );
}
