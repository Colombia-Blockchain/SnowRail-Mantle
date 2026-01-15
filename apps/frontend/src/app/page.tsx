// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Globe,
  ArrowRight,
  ShieldCheck,
  Layers,
  Cpu,
  Activity,
  Lock,
  Zap,
  Code,
  TrendingUp,
  Server,
  EyeOff,
  Play,
} from 'lucide-react'

/**
 * SNOWRAIL 2026 - UNIVERSAL PAYMENT OS
 * Architecture:
 * - Single File React Component
 * - Mocking HeroUI v3 aesthetics via Tailwind
 * - Custom Canvas Stardust Particle System
 * - Centralized i18n Dictionary
 */

// --- 1. CONFIGURATION & DICTIONARIES ---

const COLORS = {
  bg: '#0a0a16',
  primary: '#06b6d4',
  secondary: '#d946ef',
}

const DICTIONARY = {
  en: {
    nav: {
      product: 'Product',
      developers: 'Developers',
      governance: 'Governance',
    },
    hero: {
      badge: 'Executable Treasury Infrastructure',
      headline_top: 'Treasury that',
      headline_highlight: 'executes itself',
      subhead:
        'Define payment intents, enforce policies, and execute on-chain only when verifiable conditions are met. Built for B2B treasury and machine-to-machine payments.',
      cta: 'Launch app',
      secondary_cta: 'Read Paper',
    },
    problem: {
      eyebrow: 'The Gap',
      title: 'Manual or reckless automation. Nothing in between.',
      desc: 'B2B payments are trapped between human ticketing and scripts that move funds without guardrails. Agentic workflows need treasury that is programmable, verifiable, and safe.',
      cards: [
        {
          title: 'Manual cost',
          body: 'Approvals, tickets, late reconciliation, and operational errors slow every treasury flow.',
        },
        {
          title: 'Risky automation',
          body: 'Bots execute without separation of duties, limits, or audit-ready verification.',
        },
        {
          title: 'Agentic pressure',
          body: 'AI systems pay for data, tools, and APIs continuously, but finance teams need control.',
        },
      ],
    },
    about: {
      eyebrow: 'What is SnowRail',
      title: 'Executable treasury for conditional payments',
      desc: 'SnowRail converts financial policies into executable intents, evaluates external signals, and settles on-chain with auditability and optional privacy.',
      is_title: 'SnowRail is',
      is_items: [
        'A motor that turns policies into payment intents.',
        'A control layer that checks limits, permissions, and signals.',
        'A settlement engine with verifiable outcomes.',
      ],
      not_title: 'SnowRail is not',
      not_items: [
        'A trading bot',
        'A mixer as the primary product',
        'A DeFi dashboard',
        'A simple multisig wallet with automations',
      ],
      line_label: 'In one line',
      line_text:
        'Treasuries that execute payments on-chain automatically, only under verifiable rules and risk controls.',
      intent_label: 'Intent example',
      intent_example:
        'Pay 120k USDC to Vendor X only if milestone Z is validated within 10 days.',
    },
    principles: {
      eyebrow: 'Design Principles',
      title: 'Safety and control before speed',
      desc: 'SnowRail prioritizes guardrails, verifiability, and separation of duties in every flow.',
      items: [
        {
          title: 'Decision vs execution',
          body: 'Policy evaluation is separate from settlement, reducing runaway automation.',
        },
        {
          title: 'Programmable custody',
          body: 'Funds move only within defined rules, limits, and allowed destinations.',
        },
        {
          title: 'Verifiable conditions',
          body: 'Signals and oracles validate constraints before any execution.',
        },
        {
          title: 'Secure by default',
          body: 'Controls, limits, and traceability are built-in, not optional.',
        },
        {
          title: 'Optional privacy',
          body: 'ZK modules for payroll or sensitive flows without sacrificing auditability.',
        },
        {
          title: 'Chain-agnostic',
          body: 'Interoperability is a requirement, not an add-on.',
        },
      ],
    },
    architecture: {
      eyebrow: 'Architecture',
      title: 'Four layers, one execution loop',
      desc: 'Intents flow through control and execution to produce auditable outcomes.',
      layers: [
        {
          title: 'Intent layer',
          body: 'Define destination, amount, conditions, and limits.',
        },
        {
          title: 'Control layer',
          body: 'Validate policies, permissions, and external signals.',
        },
        {
          title: 'Execution layer',
          body: 'Agents execute transactions only when eligible.',
        },
        {
          title: 'Verification layer',
          body: 'On-chain confirmation with evidence for reconciliation.',
        },
      ],
    },
    flow: {
      eyebrow: 'Operational Flow',
      title: 'Intent to verification in five steps',
      desc: 'A secure pipeline that preserves governance while enabling automation.',
      steps: [
        {
          title: 'Intent',
          body: 'Register the objective and attach funds plus rules.',
        },
        {
          title: 'Validation',
          body: 'Check limits, windows, and signal conditions.',
        },
        {
          title: 'Authorization',
          body: 'Apply risk control and separation of functions.',
        },
        {
          title: 'Execution',
          body: 'Agent submits the settlement transaction.',
        },
        {
          title: 'Verification',
          body: 'Confirm final state and record evidence.',
        },
      ],
    },
    modules: {
      eyebrow: 'Core Modules',
      title: 'Everything a treasury needs to execute',
      desc: 'SnowRail combines intents, custody, signals, privacy, and tokenized assets.',
      items: [
        {
          title: 'Payment intents',
          body: 'Declarative instructions for pay, disburse, distribute, and settle.',
        },
        {
          title: 'Programmable custody',
          body: 'Limits by period, allowed destinations, and exposure controls.',
        },
        {
          title: 'Signals and oracles',
          body: 'External validation for prices, milestones, and counterparties.',
        },
        {
          title: 'ZK privacy (optional)',
          body: 'Confidential payroll, grants, and sensitive vendor payments.',
        },
        {
          title: 'RWA connectors',
          body: 'Tokenized asset modules with yield, liquidity, and risk signals.',
        },
        {
          title: 'MCP + x402',
          body: 'Universal interface for agent coordination and conditional API payments.',
        },
      ],
    },
    use_cases: {
      eyebrow: 'Use Cases',
      title: 'Built for real treasury operations',
      desc: 'Start with one flow and scale to a full execution layer.',
      items: [
        {
          title: 'API and data payments',
          body: 'Pay only when a response passes validation, reduce fraud and retries.',
        },
        {
          title: 'Payroll and contractors',
          body: 'Recurring payments with windows, limits, and optional privacy.',
        },
        {
          title: 'Grants by milestones',
          body: 'Conditional disbursements tied to verifiable delivery.',
        },
        {
          title: 'Cross-border treasury ops',
          body: 'Automate recurring movements between entities or providers.',
        },
        {
          title: 'RWA allocation',
          body: 'Deploy capital to tokenized assets under policy constraints.',
        },
      ],
    },
    kpis: {
      eyebrow: 'KPIs',
      title: 'Measure execution, control, and impact',
      desc: 'Track adoption, performance, and reduction of manual overhead.',
      items: [
        {
          value: '1,240',
          label: 'Intents per month',
          detail: 'Created and executed by policy',
        },
        {
          value: '98.7%',
          label: 'Execution success',
          detail: 'Completion vs failure rate',
        },
        {
          value: '34m',
          label: 'Avg. intent latency',
          detail: 'Intent to verification',
        },
        {
          value: '$62M',
          label: 'Volume settled',
          detail: 'Payroll, grants, and ops',
        },
        {
          value: '41%',
          label: 'Manual effort reduced',
          detail: 'Approvals and tickets',
        },
        {
          value: '18',
          label: 'Active partners',
          detail: 'Integrators in production',
        },
      ],
    },
    security: {
      eyebrow: 'Security',
      title: 'Risk controls built into the pipeline',
      desc: 'Every component operates with least privilege and verifiable constraints.',
      items: [
        'Minimum privilege for each component and agent.',
        'Separation of functions between evaluation and execution.',
        'Limits by operation, period, and action type.',
        'Observable outcomes with evidence for reconciliation.',
        'Signals/oracles used as inputs, never as absolute authority.',
        'Privacy when required without sacrificing auditability.',
      ],
    },
    next_steps: {
      eyebrow: 'Pilot Path',
      title: 'Start small, scale with confidence',
      desc: 'A structured path to validate impact without risky deployment.',
      steps: [
        'Pick one flow with high manual cost or risk.',
        'Define policies, limits, and required signals.',
        'Run a controlled pilot with clear KPIs.',
      ],
      readiness_title: 'Readiness checklist',
      readiness: [
        'Signals available for conditions',
        'Risk policies defined',
        'Reconciliation requirements documented',
        'Privacy requirements understood',
      ],
    },
    team: {
      eyebrow: 'Core Team',
      title: 'Operators and builders behind SnowRail',
      desc: 'Experienced leaders in infra, product, and execution.',
      members: [
        {
          name: 'Juan Carlos Quiceno Vasquez',
          role: 'CTO',
          contact: 'jquiceva@gmail.com',
        },
        {
          name: 'Luis Fernando Ushina',
          role: 'Software Architect',
          contact: 'guffenix@gmail.com',
        },
        {
          name: 'Daniel Luque',
          role: 'Product Manager',
          contact: 'daniluque@colombiablockchain.co',
        },
        {
          name: 'Josue Marin',
          role: 'Developer',
          contact: 'josuemarin2009@hotmail.com',
        },
        {
          name: 'Kevin Brenes',
          role: 'Developer',
          contact: 'kevin.brenes0220@gmail.com',
        },
      ],
    },
    glossary: {
      eyebrow: 'Glossary',
      title: 'Key concepts in SnowRail',
      desc: 'Shared language for intent-driven treasury.',
      terms: [
        {
          term: 'Intent',
          def: 'Declarative financial instruction with conditions and limits.',
        },
        {
          term: 'Executable treasury',
          def: 'Treasury that can execute payments automatically under verified rules.',
        },
        {
          term: 'Programmable custody',
          def: 'Funds controlled by permissions and rules with restricted execution.',
        },
        {
          term: 'Separation of functions',
          def: 'Design that separates evaluation from execution.',
        },
        {
          term: 'Oracle / signal',
          def: 'External data source used to validate conditions.',
        },
        {
          term: 'ZK privacy',
          def: 'Cryptographic proof without revealing sensitive data.',
        },
      ],
    },
    cta: {
      title: 'Ready to test SnowRail?',
      desc: 'Launch a pilot or request a technical walkthrough with your team.',
      primary: 'Start a pilot',
      secondary: 'Talk to the team',
    },
    demo: {
      label: 'System Demo',
      title: 'Consolidation in Real-Time',
    },
    zk: {
      title: 'Noir ZK Privacy Pulse',
      desc: 'Institutional privacy powered by Zero-Knowledge proofs. Business logic remains hidden from the public mempool.',
      scan_label: 'Scanning Mempool...',
      col_tx: 'TX HASH',
      col_prot: 'PROTOCOL',
      col_val: 'VALUE',
      col_thresh: 'THRESHOLD (ZK)',
    },
    audience: {
      title: 'Designed for the Architects of Value',
      tabs: {
        cfo: 'CFO / Finance',
        founder: 'Founders',
        dev: 'Developers',
        partner: 'Partners',
      },
      content: {
        cfo: {
          head: 'Unified Liquidity Command',
          body: 'SnowRail joins your bank accounts and stablecoins into a single treasury layer. No more fragmenting capital across 10 different logins.',
        },
        founder: {
          head: 'Speed at Scale',
          body: 'Automate payroll, vendor payments, and yield optimization with autonomous agents that sleep only when you do.',
        },
        dev: {
          head: 'API First Architecture',
          body: 'API/x402: Move money between banks and stablecoins like a single treasury wallet. 3 lines of code to integrate.',
        },
        partner: {
          head: 'Ecosystem Integration',
          body: 'Build compliant on-ramps and off-ramps directly into the SnowRail liquidity nebulae.',
        },
      },
    },
    mcp: {
      title: 'MCP Agent Toolbox',
      desc: 'Direct integration with Model Context Protocol for autonomous operations.',
      cards: [
        {
          cmd: 'create_intent',
          desc: 'Spin up a new cross-chain payment intent.',
        },
        { cmd: 'list_intents', desc: 'View active orchestration queues.' },
        {
          cmd: 'get_intent',
          desc: 'Deep dive into specific transaction state.',
        },
        { cmd: 'trigger_agent', desc: 'Manually invoke the treasury agent.' },
        { cmd: 'get_status', desc: 'Real-time solvency & liquidity checks.' },
      ],
    },
    footer: {
      rights: '2026 SnowRail. Orchestrating the Galaxy of Value.',
      compliance: 'ADGM / MiCA Framework 2026 Compliant',
      built_on: 'Powered by Mantle x Noir ZK',
    },
  },
  es: {
    nav: {
      product: 'Producto',
      developers: 'Desarrolladores',
      governance: 'Gobernanza',
    },
    hero: {
      badge: 'Tesoreria ejecutable',
      headline_top: 'Tesoreria que',
      headline_highlight: 'se ejecuta sola',
      subhead:
        'Define intents de pago, aplica politicas y ejecuta on-chain solo cuando las condiciones son verificables. Pensado para tesoreria B2B y pagos M2M.',
      cta: 'Lanzar app',
      secondary_cta: 'Leer paper',
    },
    problem: {
      eyebrow: 'La Brecha',
      title: 'Manualidad costosa o automatizacion riesgosa',
      desc: 'Los pagos B2B quedan atrapados entre tickets humanos y scripts que mueven fondos sin controles. Los agentes necesitan tesoreria programable, verificable y segura.',
      cards: [
        {
          title: 'Costo manual',
          body: 'Aprobaciones, tickets, conciliacion tardia y errores operativos.',
        },
        {
          title: 'Automatizacion riesgosa',
          body: 'Bots ejecutan sin separacion de funciones, limites o verificacion.',
        },
        {
          title: 'Presion agentica',
          body: 'Los agentes pagan por datos y APIs, pero finanzas requiere control.',
        },
      ],
    },
    about: {
      eyebrow: 'Que es SnowRail',
      title: 'Tesoreria ejecutable para pagos condicionales',
      desc: 'SnowRail convierte politicas financieras en intents, evalua senales externas y liquida on-chain con trazabilidad y privacidad opcional.',
      is_title: 'SnowRail es',
      is_items: [
        'Un motor que convierte politicas en intents.',
        'Una capa de control que valida limites, permisos y senales.',
        'Un motor de liquidacion con resultados verificables.',
      ],
      not_title: 'SnowRail no es',
      not_items: [
        'Un bot de trading',
        'Un mixer como producto principal',
        'Un dashboard DeFi',
        'Una simple multisig con automatizaciones',
      ],
      line_label: 'En una frase',
      line_text:
        'Tesorerias que ejecutan pagos on-chain automaticamente, bajo reglas verificables y controles de riesgo.',
      intent_label: 'Intent ejemplo',
      intent_example:
        'Pagar 120k USDC a Proveedor X solo si el hito Z se valida en 10 dias.',
    },
    principles: {
      eyebrow: 'Principios',
      title: 'Control y seguridad antes que velocidad',
      desc: 'SnowRail prioriza guardrails, verificacion y separacion de funciones.',
      items: [
        {
          title: 'Decidir vs ejecutar',
          body: 'La evaluacion de politicas se separa de la liquidacion.',
        },
        {
          title: 'Custodia programable',
          body: 'Los fondos solo se mueven bajo reglas y limites definidos.',
        },
        {
          title: 'Condiciones verificables',
          body: 'Senales y oraculos validan restricciones antes de ejecutar.',
        },
        {
          title: 'Seguro por defecto',
          body: 'Controles, limites y trazabilidad como base.',
        },
        {
          title: 'Privacidad opcional',
          body: 'ZK para payroll o pagos sensibles sin perder auditabilidad.',
        },
        {
          title: 'Chain-agnostic',
          body: 'Interoperabilidad como requisito.',
        },
      ],
    },
    architecture: {
      eyebrow: 'Arquitectura',
      title: 'Cuatro capas, un loop de ejecucion',
      desc: 'Los intents fluyen por control y ejecucion hasta evidencia verificable.',
      layers: [
        {
          title: 'Capa de intent',
          body: 'Define destino, monto, condiciones y limites.',
        },
        {
          title: 'Capa de control',
          body: 'Valida politicas, permisos y senales externas.',
        },
        {
          title: 'Capa de ejecucion',
          body: 'Agentes ejecutan solo cuando el intent es elegible.',
        },
        {
          title: 'Capa de verificacion',
          body: 'Confirmacion on-chain con evidencia para conciliacion.',
        },
      ],
    },
    flow: {
      eyebrow: 'Flujo Operativo',
      title: 'De intent a verificacion en cinco pasos',
      desc: 'Pipeline seguro que mantiene gobernanza y habilita automatizacion.',
      steps: [
        {
          title: 'Intent',
          body: 'Registrar objetivo y asociar fondos con reglas.',
        },
        {
          title: 'Validacion',
          body: 'Revisar limites, ventanas y condiciones.',
        },
        {
          title: 'Autorizacion',
          body: 'Aplicar control de riesgo y separacion de funciones.',
        },
        {
          title: 'Ejecucion',
          body: 'Agente envia la transaccion de liquidacion.',
        },
        {
          title: 'Verificacion',
          body: 'Confirmar estado final y registrar evidencia.',
        },
      ],
    },
    modules: {
      eyebrow: 'Modulos Core',
      title: 'Todo lo que una tesoreria necesita para ejecutar',
      desc: 'Intents, custodia, senales, privacidad y activos tokenizados.',
      items: [
        {
          title: 'Payment intents',
          body: 'Instrucciones declarativas para pagar y liquidar.',
        },
        {
          title: 'Custodia programable',
          body: 'Limites por periodo, destinos permitidos y control de riesgo.',
        },
        {
          title: 'Senales y oraculos',
          body: 'Validacion externa de precios, hitos o contrapartes.',
        },
        {
          title: 'Privacidad ZK (opcional)',
          body: 'Payroll, grants y pagos sensibles con confidencialidad.',
        },
        {
          title: 'Conectores RWA',
          body: 'Activos tokenizados con rendimiento, liquidez y riesgo.',
        },
        {
          title: 'MCP + x402',
          body: 'Interfaz universal para agentes y pagos condicionales.',
        },
      ],
    },
    use_cases: {
      eyebrow: 'Casos de Uso',
      title: 'Diseñado para operaciones reales',
      desc: 'Empieza con un flujo y escala a una capa completa.',
      items: [
        {
          title: 'Pagos por APIs/datos',
          body: 'Paga solo si la respuesta pasa validacion.',
        },
        {
          title: 'Payroll y contractors',
          body: 'Pagos recurrentes con ventanas, limites y privacidad opcional.',
        },
        {
          title: 'Grants por hitos',
          body: 'Desembolsos condicionados por entregables verificables.',
        },
        {
          title: 'Tesoreria cross-border',
          body: 'Movimientos recurrentes entre entidades y proveedores.',
        },
        {
          title: 'Asignacion a RWA',
          body: 'Capital a activos tokenizados bajo politicas.',
        },
      ],
    },
    kpis: {
      eyebrow: 'KPIs',
      title: 'Medir ejecucion, control e impacto',
      desc: 'Adopcion, rendimiento y reduccion de trabajo manual.',
      items: [
        {
          value: '1,240',
          label: 'Intents por mes',
          detail: 'Creados y ejecutados con politicas',
        },
        {
          value: '98.7%',
          label: 'Exito de ejecucion',
          detail: 'Completados vs fallidos',
        },
        {
          value: '34m',
          label: 'Latencia promedio',
          detail: 'Intent a verificacion',
        },
        {
          value: '$62M',
          label: 'Volumen liquidado',
          detail: 'Payroll, grants y ops',
        },
        {
          value: '41%',
          label: 'Reduccion manual',
          detail: 'Aprobaciones y tickets',
        },
        {
          value: '18',
          label: 'Partners activos',
          detail: 'Integradores en produccion',
        },
      ],
    },
    security: {
      eyebrow: 'Seguridad',
      title: 'Controles de riesgo en todo el pipeline',
      desc: 'Cada componente opera con privilegio minimo y restricciones verificables.',
      items: [
        'Privilegio minimo por componente y agente.',
        'Separacion de funciones entre evaluar y ejecutar.',
        'Limites por operacion, periodo y tipo de accion.',
        'Evidencia observable para conciliacion.',
        'Senales como inputs, nunca autoridad absoluta.',
        'Privacidad cuando aplica sin perder auditabilidad.',
      ],
    },
    next_steps: {
      eyebrow: 'Proximos Pasos',
      title: 'Empieza pequeno, escala con confianza',
      desc: 'Ruta clara para validar impacto sin riesgos.',
      steps: [
        'Selecciona un flujo con alto costo o riesgo.',
        'Define politicas, limites y senales requeridas.',
        'Piloto controlado con KPIs claros.',
      ],
      readiness_title: 'Checklist de readiness',
      readiness: [
        'Senales disponibles para condiciones',
        'Politicas de riesgo definidas',
        'Requisitos de conciliacion documentados',
        'Necesidades de privacidad entendidas',
      ],
    },
    team: {
      eyebrow: 'Equipo',
      title: 'Operadores y builders detras de SnowRail',
      desc: 'Lideres en infraestructura, producto y ejecucion.',
      members: [
        {
          name: 'Juan Carlos Quiceno Vasquez',
          role: 'CTO',
          contact: 'jquiceva@gmail.com',
        },
        {
          name: 'Luis Fernando Ushina',
          role: 'Arquitecto de software',
          contact: 'guffenix@gmail.com',
        },
        {
          name: 'Daniel Luque',
          role: 'Product manager',
          contact: 'daniluque@colombiablockchain.co',
        },
        {
          name: 'Josue Marin',
          role: 'Dev',
          contact: 'josuemarin2009@hotmail.com',
        },
        {
          name: 'Kevin Brenes',
          role: 'Dev',
          contact: 'kevin.brenes0220@gmail.com',
        },
      ],
    },
    glossary: {
      eyebrow: 'Glosario',
      title: 'Conceptos clave',
      desc: 'Lenguaje comun para tesoreria por intents.',
      terms: [
        {
          term: 'Intent',
          def: 'Instruccion financiera declarativa con condiciones y limites.',
        },
        {
          term: 'Tesoreria ejecutable',
          def: 'Tesoreria que ejecuta pagos automaticamente bajo reglas verificadas.',
        },
        {
          term: 'Custodia programable',
          def: 'Fondos controlados por permisos y reglas.',
        },
        {
          term: 'Separacion de funciones',
          def: 'Diseno que separa evaluacion y ejecucion.',
        },
        {
          term: 'Oraculo / senal',
          def: 'Fuente de datos externos para validar condiciones.',
        },
        {
          term: 'Privacidad ZK',
          def: 'Prueba criptografica sin revelar datos sensibles.',
        },
      ],
    },
    cta: {
      title: 'Listos para probar SnowRail?',
      desc: 'Lanza un piloto o solicita un walkthrough tecnico.',
      primary: 'Iniciar piloto',
      secondary: 'Hablar con el equipo',
    },
    demo: {
      label: 'Demo del Sistema',
      title: 'Consolidacion en Tiempo Real',
    },
    zk: {
      title: 'Pulso de Privacidad Noir ZK',
      desc: 'Privacidad institucional impulsada por pruebas de conocimiento cero. La logica de negocio permanece oculta de la mempool publica.',
      scan_label: 'Escaneando Mempool...',
      col_tx: 'TX HASH',
      col_prot: 'PROTOCOLO',
      col_val: 'VALOR',
      col_thresh: 'UMBRAL (ZK)',
    },
    audience: {
      title: 'Disenado para los Arquitectos del Valor',
      tabs: {
        cfo: 'CFO / Finanzas',
        founder: 'Fundadores',
        dev: 'Desarrolladores',
        partner: 'Partners',
      },
      content: {
        cfo: {
          head: 'Comando de Liquidez Unificado',
          body: 'SnowRail une tus cuentas bancarias y stablecoins en una sola capa de tesoreria. No mas capital fragmentado en 10 logins diferentes.',
        },
        founder: {
          head: 'Velocidad a Escala',
          body: 'Automatiza nominas, pagos a proveedores y optimizacion de rendimientos con agentes autonomos que nunca duermen.',
        },
        dev: {
          head: 'Arquitectura API First',
          body: 'API/x402: Mueve dinero entre bancos y stablecoins como una sola billetera de tesoreria. 3 lineas de codigo para integrar.',
        },
        partner: {
          head: 'Integracion del Ecosistema',
          body: 'Construye on-ramps y off-ramps que cumplen con la normativa directamente en la nebulosa de liquidez de SnowRail.',
        },
      },
    },
    mcp: {
      title: 'Caja de Herramientas MCP',
      desc: 'Integracion directa con Model Context Protocol para operaciones autonomas.',
      cards: [
        {
          cmd: 'create_intent',
          desc: 'Generar una nueva intencion de pago cross-chain.',
        },
        { cmd: 'list_intents', desc: 'Ver colas de orquestacion activas.' },
        {
          cmd: 'get_intent',
          desc: 'Analisis profundo del estado de una transaccion.',
        },
        {
          cmd: 'trigger_agent',
          desc: 'Invocar manualmente al agente de tesoreria.',
        },
        {
          cmd: 'get_status',
          desc: 'Chequeos de solvencia y liquidez en tiempo real.',
        },
      ],
    },
    footer: {
      rights: '2026 SnowRail. Orquestando la Galaxia del Valor.',
      compliance: 'Cumplimiento ADGM / MiCA Framework 2026',
      built_on: 'Impulsado por Mantle x Noir ZK',
    },
  },
}

// --- 2. VISUAL COMPONENTS ---

const Starfield = () => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const particles = []
    const particleCount = 100

    let mouseX = width / 2
    let mouseY = height / 2

    class Particle {
      constructor() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.size = Math.random() * 2
        this.color =
          Math.random() > 0.5 ? 'rgba(6, 182, 212, ' : 'rgba(217, 70, 239, '
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        const dx = mouseX - this.x
        const dy = mouseY - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 200) {
          this.x += dx * 0.005
          this.y += dy * 0.005
        }

        if (this.x < 0) this.x = width
        if (this.x > width) this.x = 0
        if (this.y < 0) this.y = height
        if (this.y > height) this.y = 0
      }

      draw() {
        ctx.beginPath()
        const opacity = Math.random() * 0.5 + 0.2
        ctx.fillStyle = this.color + opacity + ')'
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 22, 0.2)'
      ctx.fillRect(0, 0, width, height)

      particles.forEach((p) => {
        p.update()
        p.draw()
      })
      requestAnimationFrame(animate)
    }

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    const handleMouseMove = (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
    />
  )
}

const SpotlightLink = ({ children, href }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e) => {
    if (!e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleMouseEnter = () => setOpacity(1)
  const handleMouseLeave = () => setOpacity(0)

  return (
    <a
      href={href}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors duration-300 overflow-hidden group font-medium text-sm"
    >
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(80px circle at ${position.x}px ${position.y}px, rgba(6, 182, 212, 0.15), transparent 60%)`,
        }}
      />
      <span className="relative z-10">{children}</span>
    </a>
  )
}

const GlassCard = ({ children, className = '', hoverEffect = false }) => (
  <div
    className={`
    relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl
    ${
      hoverEffect
        ? 'hover:bg-white/10 transition-all duration-300 hover:border-cyan-500/30'
        : ''
    }
    ${className}
  `}
  >
    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-purple-500/5 pointer-events-none" />
    {children}
  </div>
)

const SectionHeading = ({ eyebrow, title, desc, align = 'left' }) => {
  const alignClass = align === 'center' ? 'text-center' : 'text-left'
  const descClass =
    align === 'center' ? 'text-gray-400 max-w-2xl mx-auto' : 'text-gray-400'
  return (
    <div className={`${alignClass} space-y-3`}>
      <div className="text-cyan-400 text-xs font-mono tracking-[0.3em] uppercase">
        {eyebrow}
      </div>
      <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
      {desc && <p className={descClass}>{desc}</p>}
    </div>
  )
}

const GlowingButton = ({
  children,
  onClick,
  href,
  target,
  rel,
  download,
  variant = 'primary',
}) => {
  const base =
    'relative px-8 py-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 overflow-hidden group'
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)]'
      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'

  const content = (
    <>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {variant === 'primary' && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
      )}
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        download={download}
        className={`${base} ${styles} inline-flex items-center`}
      >
        {content}
      </a>
    )
  }

  return (
    <button onClick={onClick} className={`${base} ${styles}`}>
      {content}
    </button>
  )
}

// --- 3. MAIN APP ---

export default function SnowRailApp() {
  const [lang, setLang] = useState('en')
  const [activeTab, setActiveTab] = useState('cfo')
  const t = DICTIONARY[lang]
  const principleIcons = [
    ShieldCheck,
    Layers,
    Lock,
    Activity,
    EyeOff,
    Cpu,
  ]
  const moduleIcons = [Zap, ShieldCheck, Activity, EyeOff, TrendingUp, Server]
  const useCaseIcons = [Code, Lock, ShieldCheck, Layers, TrendingUp]

  return (
    <div
      className="min-h-screen text-white font-sans selection:bg-cyan-500/30 relative overflow-x-hidden"
      style={{ backgroundColor: COLORS.bg }}
    >
      <Starfield />

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a16]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <Zap size={18} className="text-white" fill="currentColor" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              SnowRail<span className="text-cyan-400">.OS</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <SpotlightLink href="#product">{t.nav.product}</SpotlightLink>
            <SpotlightLink href="#governance">{t.nav.governance}</SpotlightLink>
            <SpotlightLink href="#developers">{t.nav.developers}</SpotlightLink>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 transition-colors"
            >
              <Globe size={14} />
              {lang.toUpperCase()}
            </button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section id="hero" className="relative pt-32 pb-20 px-6 z-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              {t.hero.badge}
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight">
              {t.hero.headline_top}
              <br />
              <span className="shimmer-text">{t.hero.headline_highlight}</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-lg leading-relaxed">
              {t.hero.subhead}
            </p>

            <div className="flex flex-wrap gap-4">
              <GlowingButton variant="primary" href="/dashboard">
                {t.hero.cta} <ArrowRight size={18} />
              </GlowingButton>
              <GlowingButton
                variant="secondary"
                href="/SnowRail_Paper.pdf"
                target="_blank"
                rel="noreferrer"
                download
              >
                {t.hero.secondary_cta}
              </GlowingButton>
            </div>
          </div>

          {/* 3D Mockup Graphic (CSS Composition) */}
          <div className="relative h-[500px] w-full flex items-center justify-center">
            {/* Central Hub */}
            <div className="relative w-48 h-48 bg-gradient-to-b from-[#0a0a16] to-[#1a1a2e] rounded-full border-2 border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.2)] flex items-center justify-center z-20 animate-float">
              <div
                className="absolute inset-0 rounded-full border border-cyan-500/20 animate-spin"
                style={{ animationDuration: '10s' }}
              />
              <div className="text-center">
                <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                  SnowRail
                </div>
                <div className="text-xs text-gray-500 mt-1">CORE TREASURY</div>
              </div>
            </div>

            {/* Orbiting Satellites */}
            <GlassCard className="absolute top-10 left-10 w-40 p-4 z-10 animate-float-delay-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs font-bold text-gray-300">
                  USDC Vault
                </span>
              </div>
              <div className="text-lg font-mono text-white">$4,291,000</div>
            </GlassCard>

            <GlassCard className="absolute bottom-20 right-0 w-48 p-4 z-30 animate-float-delay-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-xs font-bold text-gray-300">
                  Mantle Payroll
                </span>
              </div>
              <div className="text-lg font-mono text-white">Pending: 12 Tx</div>
            </GlassCard>

            {/* Connecting Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
              <line
                x1="30%"
                y1="20%"
                x2="50%"
                y2="50%"
                stroke="url(#lineGrad)"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
              <line
                x1="70%"
                y1="80%"
                x2="50%"
                y2="50%"
                stroke="url(#lineGrad)"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
              <defs>
                <linearGradient
                  id="lineGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* --- PROBLEM --- */}
      <section id="problem" className="relative py-20 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow={t.problem.eyebrow}
            title={t.problem.title}
            desc={t.problem.desc}
            align="center"
          />

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {t.problem.cards.map((card, idx) => (
              <GlassCard key={card.title} className="p-6">
                <div className="text-sm text-purple-300 font-mono mb-3">
                  0{idx + 1}
                </div>
                <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                <p className="text-gray-400 text-sm">{card.body}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* --- WHAT IS SNOWRAIL --- */}
      <section id="about" className="relative py-20 px-6 z-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <SectionHeading
              eyebrow={t.about.eyebrow}
              title={t.about.title}
              desc={t.about.desc}
            />

            <div className="grid sm:grid-cols-2 gap-6">
              <GlassCard className="p-6">
                <div className="text-sm text-cyan-300 font-bold mb-3">
                  {t.about.is_title}
                </div>
                <ul className="space-y-2 text-sm text-gray-400">
                  {t.about.is_items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-cyan-400">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="text-sm text-purple-300 font-bold mb-3">
                  {t.about.not_title}
                </div>
                <ul className="space-y-2 text-sm text-gray-400">
                  {t.about.not_items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-purple-400">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </div>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-8 border-cyan-500/30">
              <div className="text-xs text-cyan-400 font-mono uppercase tracking-[0.3em] mb-3">
                {t.about.line_label}
              </div>
              <div className="text-xl font-semibold text-white">
                {t.about.line_text}
              </div>
            </GlassCard>

            <GlassCard className="p-8 bg-gradient-to-br from-white/5 to-white/0">
              <div className="text-xs text-purple-400 font-mono uppercase tracking-[0.3em] mb-3">
                {t.about.intent_label}
              </div>
              <div className="text-lg text-white">{t.about.intent_example}</div>
              <div className="mt-6 text-xs text-gray-500">
                Intent ID: SR-INT-4021
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* --- PRINCIPLES --- */}
      <section id="principles" className="relative py-20 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow={t.principles.eyebrow}
            title={t.principles.title}
            desc={t.principles.desc}
            align="center"
          />

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.principles.items.map((item, idx) => {
              const Icon = principleIcons[idx % principleIcons.length]
              return (
                <GlassCard key={item.title} className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.body}</p>
                </GlassCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* --- ARCHITECTURE --- */}
      <section id="architecture" className="relative py-20 px-6 z-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <SectionHeading
            eyebrow={t.architecture.eyebrow}
            title={t.architecture.title}
            desc={t.architecture.desc}
          />

          <div className="space-y-4">
            {t.architecture.layers.map((layer, idx) => (
              <GlassCard key={layer.title} className="p-5 flex gap-4">
                <div className="text-cyan-400 font-mono text-sm">
                  0{idx + 1}
                </div>
                <div>
                  <div className="text-white font-semibold">{layer.title}</div>
                  <div className="text-sm text-gray-400">{layer.body}</div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* --- FLOW --- */}
      <section id="flow" className="relative py-20 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow={t.flow.eyebrow}
            title={t.flow.title}
            desc={t.flow.desc}
            align="center"
          />
          <div className="mt-12 grid md:grid-cols-5 gap-4">
            {t.flow.steps.map((step, idx) => (
              <GlassCard key={step.title} className="p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-cyan-300 font-bold mb-3">
                  {idx + 1}
                </div>
                <div className="font-semibold text-white mb-1">
                  {step.title}
                </div>
                <div className="text-xs text-gray-400">{step.body}</div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* --- MODULES --- */}
      <section id="modules" className="relative py-20 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow={t.modules.eyebrow}
            title={t.modules.title}
            desc={t.modules.desc}
            align="center"
          />
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.modules.items.map((item, idx) => {
              const Icon = moduleIcons[idx % moduleIcons.length]
              return (
                <GlassCard key={item.title} className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-300 mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.body}</p>
                </GlassCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* --- VIDEO DEMO SECTION (ID: PRODUCT) --- */}
      <section id="product" className="relative py-20 px-6 z-10 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-cyan-400 text-sm font-mono tracking-widest uppercase">
              {t.demo.label}
            </span>
            <h2 className="text-3xl font-bold mt-2">{t.demo.title}</h2>
          </div>

          <div className="group relative rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(217,70,239,0.3)] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_80px_rgba(217,70,239,0.5)] border border-purple-500/30">
            {/* Mock Video UI */}
            <div className="aspect-video bg-[#0f0f1e] relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />

              {/* Play Button */}
              <button className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play size={32} className="ml-1 text-white fill-white" />
              </button>

              {/* UI Overlay */}
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div>
                  <div className="text-xs text-purple-300 font-mono mb-1">
                    LIVE SESSION
                  </div>
                  <div className="text-lg font-bold">
                    Consolidating 15 Wallets into One View
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="w-1/2 h-full bg-cyan-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- USE CASES --- */}
      <section id="use-cases" className="relative py-20 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow={t.use_cases.eyebrow}
            title={t.use_cases.title}
            desc={t.use_cases.desc}
            align="center"
          />
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.use_cases.items.map((item, idx) => {
              const Icon = useCaseIcons[idx % useCaseIcons.length]
              return (
                <GlassCard key={item.title} className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-300 mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.body}</p>
                </GlassCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* --- NOIR ZK PULSE SECTION (ID: GOVERNANCE placeholder) --- */}
      <section
        id="governance"
        className="relative py-24 px-6 z-10 overflow-hidden scroll-mt-20"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <ShieldCheck className="text-purple-500" />
            <h2 className="text-2xl font-bold">{t.zk.title}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <GlassCard className="p-0 border-purple-500/20">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="text-xs font-mono text-purple-400 animate-pulse">
                    {t.zk.scan_label}
                  </div>
                </div>

                {/* Transaction List */}
                <div className="relative">
                  {/* Scanner Bar */}
                  <div className="absolute left-0 right-0 h-16 bg-gradient-to-b from-purple-500/5 to-purple-500/20 border-b border-purple-500/50 z-20 scan-line pointer-events-none" />

                  <div className="p-4 space-y-2 font-mono text-sm">
                    <div className="grid grid-cols-4 text-xs text-gray-500 mb-4 px-2">
                      <div>{t.zk.col_tx}</div>
                      <div>{t.zk.col_prot}</div>
                      <div>{t.zk.col_val}</div>
                      <div className="text-right">{t.zk.col_thresh}</div>
                    </div>

                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="grid grid-cols-4 items-center p-2 rounded hover:bg-white/5 transition-colors"
                      >
                        <div className="text-cyan-400">0x8a...2f{i}</div>
                        <div className="text-white">Aave V3</div>
                        <div className="text-white">14.5 ETH</div>
                        <div className="text-right relative">
                          {/* ZK Masking Effect */}
                          <span className="blur-sm opacity-50 select-none group-hover:blur-none transition-all">
                            $42,100.00
                          </span>
                          <Lock
                            size={12}
                            className="absolute top-1/2 right-0 -translate-y-1/2 text-purple-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </div>

            <div className="flex flex-col justify-center space-y-6">
              <p className="text-gray-400">{t.zk.desc}</p>
              <div className="p-4 rounded-xl bg-purple-900/10 border border-purple-500/20">
                <div className="text-sm font-bold text-purple-300 mb-2">
                  NOIR PROOF GENERATION
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                  <div className="bg-purple-500 h-2 rounded-full w-[85%] animate-pulse" />
                </div>
                <div className="text-xs text-right text-gray-500">
                  23ms (GPU Accel)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- AUDIENCE SELECTOR --- */}
      <section className="relative py-20 px-6 z-10 bg-gradient-to-b from-transparent to-black/40">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-3xl md:text-4xl font-bold mb-12">
            {t.audience.title}
          </h2>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Tabs */}
            <div className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 md:w-64 shrink-0">
              {Object.keys(t.audience.tabs).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-6 py-4 text-left rounded-xl transition-all duration-300 flex items-center justify-between group border ${
                    activeTab === key
                      ? 'bg-white/10 text-white border-white/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'border-transparent text-gray-500 hover:bg-white/10 hover:text-white hover:border-white/10 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                  }`}
                >
                  <span className="font-medium">{t.audience.tabs[key]}</span>
                  <div
                    className={`w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-300 ${
                      activeTab === key
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <GlassCard className="h-full p-8 md:p-12 border-cyan-500/20">
                <div className="flex flex-col h-full justify-between animate-fadeIn">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400">
                      {activeTab === 'cfo' && <TrendingUp />}
                      {activeTab === 'founder' && <Activity />}
                      {activeTab === 'dev' && <Code />}
                      {activeTab === 'partner' && <Layers />}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                      {t.audience.content[activeTab].head}
                    </h3>
                    <p className="text-lg text-gray-300 leading-relaxed">
                      {t.audience.content[activeTab].body}
                    </p>
                  </div>

                  {activeTab === 'dev' && (
                    <div className="mt-8 p-4 rounded-lg bg-black/50 font-mono text-sm border border-white/10">
                      <div className="text-gray-500 mb-2">
                        // Initialize x402 V2 Bridge
                      </div>
                      <div className="text-purple-400">
                        const<span className="text-white"> treasury </span>=
                        <span className="text-cyan-400"> new</span>
                        <span className="text-yellow-300"> SnowRail</span>({`{`}
                        <br />
                        &nbsp;&nbsp;network:{' '}
                        <span className="text-green-400">
                          &apos;Mantle_zk&apos;
                        </span>
                        ,<br />
                        &nbsp;&nbsp;privacy:{' '}
                        <span className="text-green-400">
                          &apos;strict&apos;
                        </span>
                        <br />
                        {`}`});
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* --- KPIS --- */}
      <section id="kpis" className="relative py-20 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow={t.kpis.eyebrow}
            title={t.kpis.title}
            desc={t.kpis.desc}
            align="center"
          />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.kpis.items.map((item) => (
              <GlassCard key={item.label} className="p-6">
                <div className="text-2xl font-bold text-white">
                  {item.value}
                </div>
                <div className="text-sm text-cyan-300 font-semibold mt-2">
                  {item.label}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {item.detail}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* --- SECURITY --- */}
      <section id="security" className="relative py-20 px-6 z-10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <SectionHeading
            eyebrow={t.security.eyebrow}
            title={t.security.title}
            desc={t.security.desc}
          />
          <GlassCard className="p-8 border-purple-500/20">
            <ul className="space-y-3 text-sm text-gray-300">
              {t.security.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-cyan-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </section>

      {/* --- NEXT STEPS --- */}
      <section id="pilot" className="relative py-20 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow={t.next_steps.eyebrow}
            title={t.next_steps.title}
            desc={t.next_steps.desc}
            align="center"
          />
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <div className="text-sm text-cyan-300 font-bold mb-4">
                {t.next_steps.eyebrow}
              </div>
              <ol className="space-y-3 text-sm text-gray-400">
                {t.next_steps.steps.map((step, idx) => (
                  <li key={step} className="flex gap-3">
                    <span className="text-cyan-400 font-mono">
                      0{idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </GlassCard>
            <GlassCard className="p-6 border-purple-500/20">
              <div className="text-sm text-purple-300 font-bold mb-4">
                {t.next_steps.readiness_title}
              </div>
              <ul className="space-y-3 text-sm text-gray-400">
                {t.next_steps.readiness.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-purple-400">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* --- TEAM --- */}
      <section id="team" className="relative py-20 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow={t.team.eyebrow}
            title={t.team.title}
            desc={t.team.desc}
            align="center"
          />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.team.members.map((member) => (
              <GlassCard key={member.contact} className="p-6">
                <div className="text-sm text-cyan-300 font-bold">
                  {member.role}
                </div>
                <div className="text-lg font-semibold mt-2">
                  {member.name}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {member.contact}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* --- GLOSSARY --- */}
      <section id="glossary" className="relative py-20 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow={t.glossary.eyebrow}
            title={t.glossary.title}
            desc={t.glossary.desc}
            align="center"
          />
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {t.glossary.terms.map((term) => (
              <GlassCard key={term.term} className="p-6">
                <div className="text-sm text-purple-300 font-bold mb-2">
                  {term.term}
                </div>
                <div className="text-sm text-gray-400">{term.def}</div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* --- MCP TOOLBOX & SDK (ID: DEVELOPERS) --- */}
      <section
        id="developers"
        className="relative py-20 px-6 z-10 scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12">
          {/* MCP Grid */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Server className="text-cyan-400" />
              <h3 className="text-xl font-bold">{t.mcp.title}</h3>
            </div>
            <p className="text-gray-400 mb-8">{t.mcp.desc}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {t.mcp.cards.map((card, idx) => (
                <GlassCard
                  key={idx}
                  hoverEffect
                  className={`p-5 ${idx === 4 ? 'sm:col-span-2' : ''}`}
                >
                  <div className="font-mono text-xs text-purple-400 mb-2">
                    MCP Tool
                  </div>
                  <div className="font-bold text-white mb-1">{card.cmd}</div>
                  <div className="text-xs text-gray-400">{card.desc}</div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Terminal */}
          <div className="flex flex-col justify-center">
            <div className="rounded-xl overflow-hidden bg-[#0f0f1e] border border-white/10 shadow-2xl">
              <div className="bg-[#1a1a2e] px-4 py-2 flex items-center gap-2 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="ml-2 text-xs text-gray-500 font-mono">
                  bash - node
                </div>
              </div>
              <div className="p-6 font-mono text-sm space-y-4">
                <div>
                  <span className="text-green-400">-&gt;</span>{' '}
                  <span className="text-cyan-400">~</span> npm install
                  @snowrail/agent-sdk
                  <div className="text-gray-500 text-xs mt-1">
                    added 42 packages in 1.4s
                  </div>
                </div>
                <div>
                  <span className="text-green-400">-&gt;</span>{' '}
                  <span className="text-cyan-400">~</span> node
                  treasury_agent.js
                  <div className="text-gray-300 mt-2">
                    [SnowRail] <span className="text-green-400">CONNECTED</span>{' '}
                    to Mantle Mainnet
                    <br />
                    [Agent] Analyzed 4 yield routes.
                    <br />
                    [Action] Bridging 50,000 USDC via x402...
                    <br />
                    <span className="animate-pulse text-cyan-400">
                      Waiting for ZK Proof verification...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="relative py-20 px-6 z-10">
        <div className="max-w-5xl mx-auto">
          <GlassCard className="p-10 border-cyan-500/30">
            <div className="grid md:grid-cols-[1.4fr_auto] gap-6 items-center">
              <div>
                <div className="text-2xl md:text-3xl font-bold mb-2">
                  {t.cta.title}
                </div>
                <div className="text-gray-400">{t.cta.desc}</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <GlowingButton variant="primary">
                  {t.cta.primary} <ArrowRight size={18} />
                </GlowingButton>
                <GlowingButton variant="secondary">
                  {t.cta.secondary}
                </GlowingButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="relative border-t border-white/5 bg-[#05050c] pt-20 pb-10 px-6 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="font-bold text-xl tracking-tight mb-2">
              SnowRail.OS
            </div>
            <div className="text-sm text-gray-500">{t.footer.rights}</div>
            <div className="text-xs text-gray-600 mt-1">
              {t.footer.built_on}
            </div>
          </div>

          <div className="flex gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Trust Badges (Text placeholders for logos) */}
            <div className="flex flex-col items-center">
              <Cpu size={24} />
              <span className="text-[10px] font-bold mt-1">Mantle</span>
            </div>
            <div className="flex flex-col items-center">
              <ShieldCheck size={24} />
              <span className="text-[10px] font-bold mt-1">EIGENAI</span>
            </div>
            <div className="flex flex-col items-center">
              <EyeOff size={24} />
              <span className="text-[10px] font-bold mt-1">NOIR ZK</span>
            </div>
            <div className="flex flex-col items-center">
              <Server size={24} />
              <span className="text-[10px] font-bold mt-1">ARWEAVE</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 border border-white/10 px-3 py-1 rounded-full">
            {t.footer.compliance}
          </div>
        </div>
      </footer>
    </div>
  )
}
