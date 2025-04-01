import { useEffect, useState } from "react";
import "./App.css";

import renovate from "renovate/package.json";

export default function Lookup() {
  const [config, setConfig] = useState({});
  const [state, setState] = useState();

  useEffect(() => {
    if (Object.keys(config).length === 0)
      setConfig({
        ...config,
        currentValue: "3.7.0",
        depName: "webpack",
        datasource: "npm",
      });
  }, [config]);

  const lookup = async (e) => {
    e.preventDefault();
    try {
      if (!config.packageName) config.packageName = config.depName;
      
      setState({ msg: "loading.." });
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({...config, registryUrls: config.registryUrls?.split(",")}),
      });
      setState(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  const configKey = (key) => (
    <label>
      {key}
      <input
        type="text"
        value={config[key]}
        onChange={(e) =>
          setConfig({
            ...config,
            [key]: e.target.value === "" ? undefined : e.target.value,
          })
        }
      />
    </label>
  );

  return (
    <form>
      {[
        "depName",
        "packageName",
        "currentValue",
        "manager",
        "versioning",
        "rangeStrategy",
        "datasource",
        "registryUrls",
      ].map(configKey)}
      <h4>Renovate version: {renovate.version}</h4>
      <button type="submit" onClick={lookup}>
        Renovate Lookup Package
      </button>
      <pre>
        <code>{config && JSON.stringify(config, null, 2)}</code>
      </pre>
      <pre>
        <code>{state && JSON.stringify(state, null, 2)}</code>
      </pre>
    </form>
  );
}
