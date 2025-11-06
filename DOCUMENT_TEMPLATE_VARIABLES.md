# Document Template Variables - Data Examples

This document shows **exactly** what data gets injected for each variable in document templates.

---

## Basic Project Variables

### `{{project_name}}`
```
Sprint Planning Application
```

### `{{project_description}}`
```
A web-based application to manage sprint planning, track user stories, and coordinate development teams across multiple time zones with real-time collaboration features.
```

### `{{transcript}}`
```
[Full project kickoff meeting transcript if uploaded]
Could be several pages of conversation text from initial project meetings.
```

### `{{project_summary}}`
```
Project: Sprint Planning Application
Description: A web-based application to manage sprint planning, track user stories, and coordinate development teams across multiple time zones with real-time collaboration features.
Status: In Progress (65% complete)
Client: TechCorp Solutions
Start Date: January 15, 2025
Target End: March 30, 2025
```

---

## Interview & Stakeholder Variables

### `{{question_answers}}` or `{{stakeholder_responses}}`
Shows each question with **ALL stakeholder responses** grouped together:

```
Q1: What are the primary goals for this project?
Category: Project Objectives | Priority: High
Responses (3):

  1. Sarah Johnson (Product Manager):
     "We need to reduce sprint planning time by 50% and improve team coordination across our distributed workforce."
     Answered: 1/20/2025, 2:30:15 PM

  2. Mike Chen (Engineering Lead):
     "My main goal is to have better visibility into dependencies between teams and automated capacity planning based on historical velocity."
     Answered: 1/20/2025, 3:45:22 PM

  3. Lisa Martinez (Scrum Master):
     "I want real-time updates during planning sessions and better tools for managing technical debt alongside feature work."
     Answered: 1/21/2025, 10:15:33 AM

---

Q2: What are the biggest pain points with the current process?
Category: Pain Points | Priority: High
Responses (3):

  1. Sarah Johnson (Product Manager):
     "Manual data entry, no integration with Jira, and team members in different time zones can't collaborate effectively."
     Answered: 1/20/2025, 2:35:42 PM

  2. Mike Chen (Engineering Lead):
     "We lose hours every sprint to capacity calculations and dependency mapping. It's all manual spreadsheets."
     Answered: 1/20/2025, 3:50:18 PM

  3. Lisa Martinez (Scrum Master):
     "Lack of historical data to inform planning, and no way to track our accuracy over time."
     Answered: 1/21/2025, 10:20:15 AM

---
[More Q&A pairs...]
```

### `{{responses_by_category}}`
Same Q&A data but organized by category:

```
### Project Objectives

Q1: What are the primary goals for this project?
Priority: High
Responses (3):
  1. Sarah Johnson (Product Manager): "We need to reduce sprint planning time..."
  2. Mike Chen (Engineering Lead): "My main goal is to have better visibility..."
  3. Lisa Martinez (Scrum Master): "I want real-time updates..."

Q3: What does success look like for this project?
Priority: High
Responses (3):
  [Similar format...]

---

### Pain Points

Q2: What are the biggest pain points with the current process?
Priority: High
Responses (3):
  [Similar format...]

---

### Technical Requirements

Q5: What technical constraints do we need to consider?
Priority: Medium
Responses (2):
  [Similar format...]
```

### `{{responses_by_stakeholder}}`
Same Q&A data but organized by person:

```
### Sarah Johnson

Q1: What are the primary goals for this project?
Category: Project Objectives
Response: "We need to reduce sprint planning time by 50%..."
Answered: 1/20/2025, 2:30:15 PM

Q2: What are the biggest pain points with the current process?
Category: Pain Points
Response: "Manual data entry, no integration with Jira..."
Answered: 1/20/2025, 2:35:42 PM

Q4: Who are the key stakeholders we need to involve?
Category: Stakeholders
Response: "Engineering teams, product owners, and the DevOps group..."
Answered: 1/20/2025, 2:40:10 PM

---

### Mike Chen

Q1: What are the primary goals for this project?
Category: Project Objectives
Response: "My main goal is to have better visibility into dependencies..."
Answered: 1/20/2025, 3:45:22 PM

[More responses...]
```

### `{{stakeholder_profiles}}` or `{{stakeholders}}`
```
1. Sarah Johnson - Product Manager (Product)
   Email: sarah.johnson@techcorp.com
   Status: active
   Responses: 15
   Completion: 93%

2. Mike Chen - Engineering Lead (Engineering)
   Email: mike.chen@techcorp.com
   Status: active
   Responses: 12
   Completion: 75%

3. Lisa Martinez - Scrum Master (Agile)
   Email: lisa.martinez@techcorp.com
   Status: active
   Responses: 18
   Completion: 100%

4. David Park - UX Designer (Design)
   Email: david.park@techcorp.com
   Status: active
   Responses: 8
   Completion: 50%
```

---

## Files & Questions Variables

### `{{uploads}}` or `{{files}}`
Includes file metadata **AND content** when available:

```
1. Kickoff_Meeting_Transcript.txt
   Type: kickoff_transcript
   Size: 45.23 KB
   Description: Full transcript from January 15th kickoff meeting
   Uploaded: 1/15/2025

   === FILE CONTENT ===
   [00:00:15] Sarah Johnson: Welcome everyone to the Sprint Planning App kickoff meeting.
   Today we're going to discuss the project goals, timeline, and key requirements.

   [00:01:30] Mike Chen: Thanks Sarah. From the engineering side, we see this as
   an opportunity to modernize our planning process. Currently we're using...

   [Full transcript content continues for several pages...]
   === END FILE CONTENT ===

2. TechCorp_RFP.pdf
   Type: rfp
   Size: 234.56 KB
   Description: Original RFP document with detailed requirements
   Uploaded: 1/10/2025

   === FILE CONTENT ===
   REQUEST FOR PROPOSAL
   Sprint Planning Application

   1. EXECUTIVE SUMMARY
   TechCorp Solutions is seeking proposals for a web-based sprint planning
   application that will serve 150+ users across 8 development teams...

   2. SCOPE OF WORK
   The selected vendor will be responsible for...
   [Full RFP content...]
   === END FILE CONTENT ===

3. Current_Process_Flowchart.png
   Type: supplemental_doc
   Size: 128.45 KB
   Description: Visual diagram of our current sprint planning workflow
   Uploaded: 1/12/2025

   Preview: [Image file - content not extracted as text]

4. team_org_chart.pdf
   Type: org_chart
   Size: 89.12 KB
   Description: Organizational structure showing all development teams
   Uploaded: 1/13/2025

   === FILE CONTENT ===
   [Extracted text from PDF if available, or:]
   Preview: Organizational chart showing Engineering division with 8 teams...
   === END FILE CONTENT ===
```

**Note**: Content extraction depends on file type:
- `.txt`, `.md`: Full content included
- `.pdf`, `.docx`: Text extracted if possible
- `.csv`: Formatted table data
- Images, videos: Metadata only with preview text

### `{{questions}}` or `{{question_list}}`
```
- [Project Objectives] What are the primary goals for this project?
- [Pain Points] What are the biggest pain points with the current process?
- [Stakeholders] Who are the key stakeholders we need to involve?
- [Timeline] What is the expected timeline and are there any hard deadlines?
- [Technical Requirements] What technical constraints do we need to consider?
- [User Needs] Who are the primary users and what are their key workflows?
- [Success Metrics] How will we measure success?
- [Budget] What is the approved budget range?
- [Integration] What existing systems need to integrate with this solution?
- [Security] What security and compliance requirements must be met?
- [Scalability] What are the expected growth projections?
- [Support] What ongoing support requirements are there?
```

---

## Variable Summary Table

| Variable | What It Contains | Best Used For |
|----------|-----------------|---------------|
| `{{project_name}}` | Just the name | Headers, titles |
| `{{project_description}}` | Brief description | Context setting |
| `{{transcript}}` | Full meeting text | Detailed analysis |
| `{{project_summary}}` | All project metadata | Executive summary |
| `{{question_answers}}` | Q&A with all responses per question | Requirements docs, detailed analysis |
| `{{responses_by_category}}` | Q&A grouped by topic | Organized reports |
| `{{responses_by_stakeholder}}` | Q&A grouped by person | Stakeholder summaries |
| `{{stakeholder_profiles}}` | Name, role, stats | Team roster, contact info |
| `{{uploads}}` | Files + extracted content | Including source documents |
| `{{questions}}` | Just the questions | Question reference |

---

## Example Template Using Multiple Variables

```
Generate a comprehensive Sprint 0 Summary document.

PROJECT CONTEXT:
{{project_summary}}

STAKEHOLDER TEAM:
{{stakeholder_profiles}}

KEY INSIGHTS FROM INTERVIEWS:
Organize the insights by category to show common themes:
{{responses_by_category}}

SUPPORTING DOCUMENTATION:
The following documents provide additional context:
{{uploads}}

DELIVERABLES:
Create a document with these sections:
1. Executive Summary (2-3 paragraphs)
2. Project Objectives (from stakeholder responses)
3. Pain Points & Challenges (organized by priority)
4. Proposed Solution Approach
5. Key Requirements (in a table with Priority and Status columns)
6. Technical Considerations
7. Success Metrics
8. Next Steps & Recommendations

Use callouts for important risks or assumptions.
Include a table comparing current vs. proposed process.
```

This template would produce a rich document with all the stakeholder data properly organized and formatted.
