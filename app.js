const wizard = document.getElementById("wizard");
if (wizard) {
  wizard.innerHTML = `<h2>Almost there</h2>
    <p style="color:var(--muted);font-size:13px">The UI shell is live. Drop the full <code>app.js</code> from the Givre project onto this repo (Add file → Upload) to turn the wizard and 3D preview on.</p>
    <p style="color:var(--muted);font-size:13px">Repo: <a href="https://github.com/hilsbos/givre" style="color:var(--accent)">hilsbos/givre</a></p>`;
}
