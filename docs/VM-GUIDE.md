# How this project started — classic Whirled on a VM

**Track: classic Whirled / msoy.** Label: `whirled` / `classic-lab`.

This is how the maintainer actually got the original stack booting. The guest is Linux. The **host this guide was written on is Windows 7**. You do not need Windows 7. VirtualBox runs on Windows 10/11, macOS, and Linux. The guest is what matters.

Whirled 2 (the Pixi room in this repo) is built on a normal PC, not inside this VM. Do not mix the two.

Companion pages: [CLASSIC-LAB.md](CLASSIC-LAB.md) (what the stack needs), [FIXES.md](FIXES.md) (every public build failure we mapped).

---

## What we used

| Piece | This lab |
| --- | --- |
| Host OS | Windows 7 |
| Hypervisor | Oracle **VirtualBox** |
| Guest | **Debian 13**, XFCE desktop |
| VM name | `whirled-lab` |
| RAM given to the guest | **3 GB** |
| CPU virt | SVM / hardware virtualization **on** in the BIOS |
| Disk | Virtual disk on a second host drive (this box used `E:` because the system drive was tight — put yours anywhere with space) |
| Network | **NAT** (see below) |
| Goal | Boot classic msoy locally. No home ports. |

If your host is newer than Windows 7, copy the guest settings, not the host year.

---

## Why a VM at all

Classic msoy wants **Linux + Java 8 + Ant + Postgres**. Building it on raw Windows dies on missing Unix tools (`egrep` → greyhavens/msoy#4). A VM is the clean split:

- Host: whatever you already have (here, Win7).
- Guest: a small Debian box that only exists to run the museum stack.

Do not open the guest to the internet. NAT keeps it on the host. Bridged mode is how this lab once knocked the **whole Windows box offline** (bridged + USB Wi-Fi). Use NAT.

---

## 1. Host prep (Windows 7 here; same idea elsewhere)

1. Turn on virtualization in BIOS/UEFI (**SVM** on AMD, **VT-x** on Intel). VirtualBox is miserable without it.
2. Install [VirtualBox](https://www.virtualbox.org/) for your host OS.
3. Download a **Debian 13** netinst or live ISO with XFCE (or install Debian then `tasksel` XFCE). Other Debian-family guests work. This lab used Debian 13 + XFCE so there is a desktop and a terminal.
4. Give the VM at least **3 GB RAM** if the host can spare it. 2 GB will fight you.
5. Put the virtual disk on a drive with room. Paths with spaces cause classic-stack pain later — keep the *guest* path clean even if the host path is ugly.
6. Network adapter: **NAT**. Not Bridged. Not a USB Wi-Fi passthrough experiment.

Optional and useful: enable an SSH server in the guest after install so you can work from the host terminal. XFCE is enough if you would rather stay inside the window.

---

## 2. Guest install (Debian + XFCE)

Inside the new VM:

1. Install Debian 13. Hostname can be anything local — **do not publish it**.
2. Desktop: XFCE.
3. Create a normal user. You will `sudo`.
4. After first boot, update packages, then install the lab tools:

```bash
sudo apt update
sudo apt install -y openjdk-8-jdk ant git postgresql postgresql-contrib curl unzip
java -version    # must print 1.8 / Java 8, not 17 or 21
ant -version
```

If Debian 13’s default Java is newer than 8, install 8 explicitly and point `JAVA_HOME` at it **before** you run Ant. Wrong JDK is the first way this stack dies. See [FIXES.md](FIXES.md).

5. Postgres: create a role named `msoy` (no password in this repo):

```sql
-- as a postgres admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'msoy') THEN
    CREATE USER msoy;
  END IF;
END
$$;
```

---

## 3. Get the classic source (guest only)

Clone into a path **with no spaces**. Example shape:

```bash
mkdir -p ~/src
cd ~/src
git clone https://github.com/greyhavens/msoy.git
# also the libraries the build expects — narya / nenya / vilya / whirled-api / thane
# as your tree layout needs. FelixWolf/msoy is the fork still touching build scripts.
```

Do not drop this tree on the Windows desktop and share it into the VM as `Whirled Source`. Spaces in the path made [greyhavens/msoy#36](https://github.com/greyhavens/msoy/issues/36) unreadable (`msoy-server.conf`).

This repo (`whirledclassic/whirled2`) does **not** contain msoy. Do not commit the classic source or player dumps here.

---

## 4. Build and boot

Order that actually worked:

```bash
java -version          # 1.8
# dist the Three Rings libraries first if they are separate clones
#   cd ~/src/narya && ant dist
cd ~/src/msoy
ant -p                 # see distall, asclient, flashapps, gclients, …
# ant dist    or   ant distall   — start smaller if distall explodes
ls bin                 # expect msoyserver after a real dist
chmod +x bin/msoyserver
./bin/msoyserver
```

Healthy-looking boot (from older public reports and this lab) mentions Jetty on a local port, a policy port, and `Msoy server initialized`. That is **not** “open this to the street.”

If the server is up and the browser says *“We’re not in Kansas any more Toto!”*, the Java process is running and the Flash/GWT clients were not built. That is [greyhavens/msoy#23](https://github.com/greyhavens/msoy/issues/23). Run the client targets (`asclient`, `flashapps`, `gclients`). Details in [FIXES.md](FIXES.md).

---

## 5. Network rules for this lab

- **NAT.** The guest can reach the internet to `apt` and `git`. The internet should not reach the guest.
- Do not forward 8080 / 80 / 47623 / 47624 to the host’s public NIC.
- Do not put the VM on Bridged + USB Wi-Fi. That combination took the Windows 7 host off the network once. NAT after that.
- Do not paste guest hostnames, IPs, or `msoy-server.conf` into GitHub issues or Discord.

When a *public* URL is needed, that is the Whirled 2 room on a cheap VPS with HTTPS — issue [#4](https://github.com/whirledclassic/whirled2/issues/4). Not this VM.

---

## 6. Two machines, two jobs

| Machine | Job |
| --- | --- |
| Windows 7 host + VirtualBox guest `whirled-lab` | Classic msoy. Museum / lab. |
| Main PC (not the VM) | Whirled 2. TypeScript + Pixi. This git repo. |

If you only care about a 2026 browser room, you can skip the VM entirely and work on issues labeled `whirled2`.

---

## 7. Checklist before you ask for help

Paste these, nothing else:

```text
host OS:        (Win7 / Win11 / …)
VirtualBox:     (version)
guest:          Debian 13 XFCE (or what you used)
java -version:  (must be 8)
ant -version:
first BUILD FAILED block:
network:        NAT / bridged / ?
```

Open a `whirled` issue here. Do not file “ant failed” with no versions.
