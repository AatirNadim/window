# Local Development on a Wi-Fi Network

This guide explains how to run Window on one development machine and connect a second device on the same Wi-Fi network. The signaling server and UI remain local to the development machine; file data still travels over WebRTC between peers.

## Method 1: Share the development machine's LAN address

This is the supported, simplest method. The server peer shares the machine's local IP address and the other peer opens the UI at that address. Both devices must be on a network that permits device-to-device connections.

### 1. Find the development machine's LAN IP

Find the IPv4 address of the Wi-Fi interface on the machine running Window. It will commonly look like `192.168.1.20` or `10.0.0.20`. Do not use `127.0.0.1` or `localhost`: those addresses refer to the device making the request.

The address may change when the machine reconnects or its DHCP lease changes. If it does, use the new address in the steps below. A DHCP reservation can make it stable, but is optional.

### 2. Point the UI at the LAN signaling address

In `window-ui`, create or edit `.env.local` and set the signaling host and port, without a URL scheme:

```dotenv
VITE_SERVER_PATH=192.168.1.20:8080
```

Replace `192.168.1.20` with the development machine's LAN IP. `VITE_SERVER_PATH` is read by the UI when Vite starts, so restart the UI dev server after changing it.

### 3. Start the signaling server and LAN-accessible UI

In one terminal:

```bash
cd server
pnpm install
pnpm dev
```

The signaling server listens on port `8080`. In another terminal:

```bash
cd window-ui
pnpm install
pnpm dev -- --host 0.0.0.0
```

Vite's `--host 0.0.0.0` makes the UI dev server reachable from other interfaces on the machine. The second device opens:

```text
http://192.168.1.20:3000
```

Use the same LAN IP in both the URL and `VITE_SERVER_PATH`. Each device opens the same room in Window to connect as peers.

### 4. Check network access

- Allow inbound TCP connections to ports `3000` (Vite UI) and `8080` (signaling) in the development machine's firewall.
- Confirm both devices are on the same Wi-Fi/LAN. Guest Wi-Fi, client isolation, or corporate network rules may block device-to-device traffic even when both devices have internet access.
- If the page loads but signaling does not connect, check the `VITE_SERVER_PATH` value and firewall access to port `8080`.
- WebRTC data channels connect peer-to-peer independently of the signaling connection. Some networks also restrict that direct path; configure a TURN service if required (see the root README's TURN section).

The router already learns local address information as devices join the network. No router-table change is needed. Sharing the LAN IP is how the second device learns which machine to contact.

## Method 2: Discover a local proxy with mDNS

This is an optional convenience for networks that allow multicast DNS (mDNS/Bonjour). It avoids manually telling the second peer the host address, but it is **not implemented by this project today** and requires extra local tooling or application support on both sides.

The intended flow is:

1. A local proxy runs on the development machine. It serves or forwards the UI and forwards a signaling path to the local signaling server on port `8080`.
2. The proxy advertises a service on the LAN using mDNS, for example a development-only service name such as `_window-dev._tcp` and the proxy's port.
3. A discovery-capable client on the second device browses for that service, obtains the proxy host and port, and opens the UI/signaling connection through it.

An mDNS advertisement is a local-network announcement, not a router-table update or an internet-hosted proxy. The proxy still runs on the development machine, and the second peer must have a way to browse mDNS records. Ordinary web pages cannot generally browse arbitrary mDNS services, so a browser-only client cannot silently discover this service without a supported browser feature, native helper, or a separate discovery page/tool. Wi-Fi access points may also block multicast traffic or isolate clients; in that case mDNS discovery will fail and Method 1 is the fallback.

To implement this method, configure a reverse proxy for the UI and WebSocket signaling endpoint, advertise the proxy's service with an mDNS responder, and add a discovery-capable client flow that uses the discovered host and port. Keep the service development-only; production clients should use the deployed server address. Do not advertise a proxy as available unless it is running and reachable.

## Production connection

Production deployments use the configured hosted server address. LAN IP sharing and mDNS are local development options; neither is required for normal production connections.
