# Dynamic Agent Triggering

## Overview
Agents kunnen nu dynamisch bepalen welke andere agents uitgevoerd moeten worden op basis van hun analyse. Dit maakt intelligente, adaptieve workflows mogelijk.

## Hoe het werkt

### Agent Output Format
Agents moeten in hun JSON output een `triggerAgents` array opnemen met de rollen van agents die getriggerd moeten worden:

```json
{
  "success": true,
  "variables": {
    "hasIssues": true,
    "bugCount": 3,
    "featureCount": 2
  },
  "triggerAgents": ["Bug Fixer", "Feature Developer", "Test Runner"],
  "data": {
    "analysis": "Found 3 bugs and 2 feature requests"
  }
}
```

### Voorbeelden

#### Team Manager die taken verdeelt
```json
{
  "success": true,
  "variables": {
    "totalIssues": 10,
    "criticalBugs": 3,
    "features": 5,
    "tests": 2
  },
  "triggerAgents": [
    "Bug Fixer",           // Voor de 3 critical bugs
    "Feature Developer",    // Voor de 5 features
    "Test Runner"          // Voor de 2 test issues
  ],
  "data": {
    "assignments": {
      "bugFixer": ["issue-1", "issue-2", "issue-3"],
      "featureDev": ["issue-4", "issue-5", "issue-6", "issue-7", "issue-8"],
      "testRunner": ["issue-9", "issue-10"]
    }
  }
}
```

#### GitHub Specialist die conditionally triggert
```json
{
  "success": true,
  "variables": {
    "hasPullRequests": true,
    "prCount": 2,
    "needsReview": true
  },
  "triggerAgents": ["Code Reviewer"],  // Alleen code reviewer nodig
  "data": {
    "pullRequests": [...]
  }
}
```

#### Laravel Expert die geen verdere agents nodig heeft
```json
{
  "success": true,
  "variables": {
    "analysisComplete": true,
    "noIssuesFound": true
  },
  "triggerAgents": [],  // Of helemaal weglaten - workflow stopt
  "data": {
    "report": "All Laravel code is optimal"
  }
}
```

## Implementatie Status

### ✅ Completed
- [x] `AgentOutput` interface uitgebreid met `triggerAgents?: string[]`
- [x] Agent prompts documenteren `triggerAgents` usage
- [x] Voorbeelden in prompt voor agents

### 🔨 In Progress
- [ ] Workflow execution logic om `triggerAgents` te parsen
- [ ] Dynamische agent execution op basis van `triggerAgents`
- [ ] UI visualisatie van dynamisch getriggerde agents

### 📋 TODO
1. **Parse triggerAgents** uit agent output in `projectAnalyzer.ts`
2. **Queue systeem** voor dynamisch getriggerde agents
3. **Parallel vs Sequential** execution options
4. **Prevent infinite loops** (max depth, agent already executed check)
5. **UI updates** om dynamische flow te visualiseren
6. **Logging** van welke agent welke agents heeft getriggerd

## Use Cases

1. **Team Manager** analyseert GitHub issues → triggert Bug Fixer + Feature Developer
2. **Code Reviewer** vindt security issues → triggert Security Developer
3. **Bug Fixer** lost bug op → triggert Test Runner voor verificatie
4. **Test Runner** tests falen → triggert Bug Fixer opnieuw
5. **Laravel Expert** maakt changes → triggert Code Reviewer → triggert Deployment Manager

## Agent Role Names
Gebruik exacte rol namen zoals gedefinieerd in het systeem:
- "Team Manager"
- "Bug Fixer"
- "Feature Developer"
- "GitHub Specialist"
- "Security Developer"
- "Test Runner"
- "Laravel Expert"
- "Code Reviewer"
- "Deployment Manager"
- "Envoyer Deployer"
- "Email Notifier"
- "Insurance Expert"
- "Performance Developer"

## Future Enhancements
- **Conditional triggering**: `triggerAgentsIf: { condition: "bugCount > 5", agents: ["Bug Fixer", "Security Developer"] }`
- **Priority/Order**: Agents kunnen priority meegeven
- **Agent parameters**: Extra context meegeven aan getriggerde agents
- **Workflow visualizer**: Real-time visualisatie van dynamische flow
