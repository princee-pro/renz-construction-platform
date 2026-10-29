# RENZ client download and ownership guide

**29 October 2026 — RENZ Construction Services Ltd. BRICK BY BRICK.**

The repository is **public** for the client source handover. Public page access and the ZIP download were verified without authentication on 29 October 2026. The [publication verification record](GITHUB_PUBLICATION_VERIFICATION.md) records the checks and inspected version.

## Download and extract on Windows

**No GitHub account is needed**:

1. Open [princee-pro/renz-construction-platform](https://github.com/princee-pro/renz-construction-platform).
2. Select **main**, unless the developer supplies another handover version.
3. Above the files, click **Code → Download ZIP**. Save it to Downloads.
4. Open **File Explorer → Downloads**, right-click the ZIP and select **Extract All…**.
5. Choose a folder such as `Documents\RENZ-source`, then select **Extract**.
6. Open the extracted folder and find **README.md**, followed by **docs → HANDOFF_START_HERE.md**. There may be an extra folder inside the first one.

These are [GitHub's source-download steps](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives). You can also use the [direct ZIP download](https://github.com/princee-pro/renz-construction-platform/archive/refs/heads/main.zip). If access changes later, ask the repository administrator to confirm its status. Do not share passwords or verification codes.

## What you receive

The archive contains the selected version's website, Owner CMS and Admin source, database migrations, tests, scripts, documentation, configuration templates, dependency lockfile, and committed images, logos, fonts and their notices. Keep the concept-image labels and [asset provenance/licence records](ASSET_AND_LICENSE_REGISTER.md).

**This is source code, not an installer or a running website.** A developer follows [environment setup](ENVIRONMENT_SETUP.md) to install dependencies and configure local services. Downloading does not deploy RENZ or create a staff login.

The archive excludes real credentials, `.env.local`, staff passwords/MFA secrets, private account fixtures, installed dependencies, builds and temporary output. **Live database records and private Supabase Storage file bytes are separate.** Invoice/PDF code is included; actual client documents and business records are not a source backup. Database and file recovery follow the [backup runbook](RENZ_BACKUP_RESTORE.md).

## Keep a backup

Keep the original ZIP and a second backup copy. Record the download date and ask the developer for its exact commit/version. Edit the extracted copy. A ZIP is a snapshot without full Git history; the developer should retain a Git/history backup and arrange database/Storage backups separately. A later download of main may differ.

## Public access and ownership

Public visibility allows viewing/downloading; it does **not** assign copyright, add an open-source licence, or transfer repository administration. This guide makes no claim about an unverified legal rights holder. Existing notices remain applicable. See [GitHub's licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

A formal GitHub transfer is separate: with owner approval, verify the receiving username/organization, then use **Settings → Danger Zone → Transfer**. Review target eligibility and plan effects; a receiving personal account accepts within one day. History is preserved, collaborators and integrations may remain, and old URLs redirect; review access/settings and update developer remotes afterward. [GitHub's transfer guide](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository).

Neither downloading nor changing visibility transfers hosting, domain/DNS, Supabase or backup accounts. No transfer or deployment is performed by this guide.
