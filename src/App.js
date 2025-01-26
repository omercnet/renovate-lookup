import { useEffect, useState } from "react";
import "./App.css";

import renovate from "renovate/package.json";

export default function Lookup() {
  const [config, setConfig] = useState({});
  const [state, setState] = useState();

  useEffect(() => {
    if (!config)
      setConfig({
        ...config,
        manager: "npm",
        versioning: "npm",
        rangeStrategy: "replace",
        currentValue: "3.7.0",
        packageName: "webpack",
        datasource: "npm",
      });
  }, [config]);

  const lookup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      setState(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form>
      <label>
        packageName
        <input
          type="text"
          value={config.packageName}
          onChange={(e) =>
            setConfig({ ...config, packageName: e.target.value })
          }
        />
      </label>
      <label>
        currentValue
        <input
          type="text"
          value={config.currentValue}
          onChange={(e) =>
            setConfig({ ...config, currentValue: e.target.value })
          }
        />
      </label>
      <label>
        manager
        <input
          type="text"
          value={config.manager}
          onChange={(e) => setConfig({ ...config, manager: e.target.value })}
        />
      </label>
      <label>
        versioning
        <input
          type="text"
          value={config.versioning}
          onChange={(e) => setConfig({ ...config, versioning: e.target.value })}
        />
      </label>
      <label>
        rangeStrategy
        <input
          type="text"
          value={config.rangeStrategy}
          onChange={(e) =>
            setConfig({
              ...config,
              rangeStrategy: e.target.value,
            })
          }
        />
      </label>
      <label>
        datasource
        <input
          type="text"
          value={config.datasource}
          onChange={(e) => setConfig({ ...config, datasource: e.target.value })}
        />
      </label>
      <h4>Renovate version: {renovate.version}</h4>
      <button type="submit" onClick={lookup}>
        Renovate Lookup Package
      </button>
      <pre>
        <code>{state && JSON.stringify(state, null, 2)}</code>
      </pre>
    </form>
  );
}
