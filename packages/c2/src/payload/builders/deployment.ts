import type { PayloadConfig } from "@/lib/payloads/generator"
import { generateImplantConfigYAML } from "./config-yaml"

export function generateDockerfile(config: PayloadConfig): string {
  const configYaml = generateImplantConfigYAML(config)
  const binaryName = config.camouflage?.enabled && config.camouflage.binaryName
    ? config.camouflage.binaryName
    : config.name

  return `# syntax=docker/dockerfile:1
FROM golang:1.22-alpine AS builder
WORKDIR /build

COPY payload.go .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \\
    go build -ldflags="-s -w" -o /out/${binaryName} .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /out/${binaryName} /usr/local/bin/${binaryName}
USER nonroot:nonroot
ENTRYPOINT ["/usr/local/bin/${binaryName}"]
`
}

export function generateDockerCompose(config: PayloadConfig): string {
  const binaryName = config.camouflage?.enabled && config.camouflage.binaryName
    ? config.camouflage.binaryName
    : config.name

  return `services:
  implant:
    build: .
    image: ${binaryName}:latest
    container_name: ${binaryName}
    restart: always
    network_mode: host
    environment:
      - HYSTERIA_SERVER=${config.hysteriaConfig.server}
    logging:
      driver: "none"
`
}

export function generateK8sDeployment(config: PayloadConfig): string {
  const binaryName = (config.camouflage?.enabled && config.camouflage.binaryName
    ? config.camouflage.binaryName
    : config.name).toLowerCase().replace(/[^a-z0-9-]/g, "-")

  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${binaryName}
  namespace: default
  labels:
    app: ${binaryName}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${binaryName}
  template:
    metadata:
      labels:
        app: ${binaryName}
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
        - name: ${binaryName}
          image: registry.local/${binaryName}:latest
          imagePullPolicy: Always
          resources:
            requests:
              cpu: "50m"
              memory: "32Mi"
            limits:
              cpu: "500m"
              memory: "128Mi"
          securityContext:
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 65534
      restartPolicy: Always
`
}
