// Seed content for scripts/seed-docs.ts: a small analytics-school workspace whose
// documents reference each other, so chat answers can combine several sources.

export type Block =
    | { h: string; level?: 1 | 2 | 3 }
    | { p: string }
    | { ul: string[] }
    | { ol: string[] };

export interface SeedDoc {
    title: string;
    blocks: Block[];
}

export const SEED_DOCS: SeedDoc[] = [
    {
        title: "Q4 2026 OKRs",
        blocks: [
            { h: "Q4 2026 OKRs", level: 1 },
            { p: "Owner: Shubham Kumar. Review cadence: every second Monday in the leadership sync. These OKRs run from October 1 to December 31, 2026." },
            { h: "Objective 1: Grow paid enrollments" },
            { ul: [
                "KR1: Reach 1,800 paid learners across all programs (Q3 ended at 1,240).",
                "KR2: Lift trial-to-paid conversion from 9.5% to 13%.",
                "KR3: Launch the Data Engineering Bootcamp with at least 120 learners in the first cohort.",
            ] },
            { h: "Objective 2: Improve learner outcomes" },
            { ul: [
                "KR1: Course completion rate for the SQL for Analysts track above 62% (currently 48%).",
                "KR2: Placement rate within 6 months of graduation at 70% for the Data Analytics Pro program.",
                "KR3: Average mentor-session CSAT of 4.6 / 5 or higher.",
            ] },
            { h: "Objective 3: Make the business more efficient" },
            { ul: [
                "KR1: Bring blended customer acquisition cost (CAC) under ₹4,200 per paid learner (Q3: ₹5,100).",
                "KR2: Cut support first-response time to under 2 hours on weekdays.",
                "KR3: Keep monthly cloud spend for the learning platform under ₹3.5 lakh.",
            ] },
            { p: "Biggest risk: the Data Engineering Bootcamp depends on hiring two senior instructors (see Hiring Plan). If they are not signed by November 1, the bootcamp launch moves to January." },
        ],
    },
    {
        title: "Product Roadmap — Learning Platform",
        blocks: [
            { h: "Learning Platform Roadmap", level: 1 },
            { p: "This roadmap covers the student-facing platform (web + Android app) for October 2026 to March 2027. Engineering lead: Priya Nair. Product: Shubham Kumar." },
            { h: "Now (October–November)" },
            { ul: [
                "In-browser SQL playground with auto-graded exercises, powered by DuckDB-WASM so queries run on the learner's machine.",
                "Progress streaks and weekly goals, to support the completion-rate OKR.",
                "Fix the video player buffering issue on slow 4G networks (top complaint in the Customer Feedback Summary).",
            ] },
            { h: "Next (December–January)" },
            { ul: [
                "AI teaching assistant that answers doubts using course notes, with human mentor escalation.",
                "Cohort leaderboards and peer code review for the Data Engineering Bootcamp.",
                "Hindi subtitles for the top 20 most-watched lessons.",
            ] },
            { h: "Later (February–March)" },
            { ul: [
                "Employer portal so hiring partners can browse graduate portfolios.",
                "Offline downloads in the Android app.",
            ] },
            { p: "Deliberately not doing this half: a native iOS app. Only 7% of learners use iOS, so the mobile web experience is good enough for now." },
        ],
    },
    {
        title: "Customer Feedback Summary — September 2026",
        blocks: [
            { h: "Customer Feedback Summary — September 2026", level: 1 },
            { p: "Sources: 312 NPS survey responses, 86 support tickets, and 14 learner interviews. NPS for September was 41, down from 46 in August." },
            { h: "Top complaints" },
            { ol: [
                "Video buffering on mobile data (mentioned by 38% of detractors). Most affected cities: Patna, Lucknow, Guwahati.",
                "Mentor sessions are hard to book in the evening slots (7–10 PM), which is when working professionals are free.",
                "SQL assignments feel disconnected from real jobs; learners want messier, real-world datasets.",
                "Certificate verification links were broken for two weeks after the domain migration.",
            ] },
            { h: "What learners love" },
            { ul: [
                "Mentor quality, especially for case-study interview prep.",
                "The Power BI capstone project; several learners used it directly in job interviews.",
                "Community Discord: fast answers from peers, often within 15 minutes.",
            ] },
            { h: "Actions" },
            { ul: [
                "Engineering is fixing buffering with adaptive bitrate streaming (on the roadmap for October–November).",
                "Ops will add 40 more evening mentor slots per week starting October 14.",
                "Curriculum team will replace 6 SQL assignments with datasets from real e-commerce and fintech companies.",
            ] },
        ],
    },
    {
        title: "SQL for Analysts — Course Syllabus",
        blocks: [
            { h: "SQL for Analysts — Syllabus", level: 1 },
            { p: "Duration: 8 weeks, about 6 hours per week. Level: beginner to intermediate. Lead instructor: Rahul Verma. Database used in class: PostgreSQL 16." },
            { h: "Weekly plan" },
            { ol: [
                "Week 1: SELECT, WHERE, ORDER BY, and thinking in tables.",
                "Week 2: Aggregations with GROUP BY and HAVING; common mistakes with NULLs.",
                "Week 3: JOINs (inner, left, full) and how to debug row explosions.",
                "Week 4: Subqueries and Common Table Expressions (CTEs).",
                "Week 5: Window functions: ROW_NUMBER, RANK, LAG/LEAD, running totals.",
                "Week 6: Date handling, cohort analysis, and retention curves.",
                "Week 7: Query performance basics: indexes and reading EXPLAIN plans.",
                "Week 8: Capstone: analyse a real e-commerce dataset and present findings to a mock stakeholder.",
            ] },
            { h: "Assessment" },
            { p: "Weekly auto-graded assignments count for 40%, the capstone for 40%, and two timed SQL quizzes for 20%. Passing score is 65%. Learners who score above 85% get a 'Distinction' badge on their certificate." },
            { p: "Completion rate is currently 48%; most drop-offs happen in Week 5 (window functions). The Q4 plan adds two extra live doubt-clearing sessions in that week." },
        ],
    },
    {
        title: "Weekly Team Sync — Oct 5, 2026",
        blocks: [
            { h: "Weekly Team Sync — October 5, 2026", level: 1 },
            { p: "Attendees: Shubham Kumar, Priya Nair (Engineering), Ananya Sharma (Marketing), Rahul Verma (Curriculum), Karan Mehta (Operations)." },
            { h: "Updates" },
            { ul: [
                "Priya: The SQL playground beta is live for 200 learners. Average query run time is 120 ms. Two bugs found with very large CSV uploads.",
                "Ananya: The September Instagram campaign brought in 4,100 leads at ₹62 per lead; YouTube Shorts was cheaper at ₹41 per lead.",
                "Rahul: Week 5 of the SQL course has been re-recorded with shorter videos (max 9 minutes each).",
                "Karan: 40 new evening mentor slots confirmed from October 14. Three new mentors onboarded.",
            ] },
            { h: "Decisions" },
            { ul: [
                "Move 30% of the paid-social budget from Instagram to YouTube Shorts for October.",
                "Data Engineering Bootcamp price set at ₹59,999, with an early-bird price of ₹49,999 until November 15.",
                "The AI teaching assistant will use our own course notes only, not general web content.",
            ] },
            { h: "Action items" },
            { ul: [
                "Priya: fix large CSV upload bug by October 12.",
                "Ananya: draft the bootcamp launch campaign by October 10.",
                "Shubham: close the two senior instructor offers by October 25.",
            ] },
        ],
    },
    {
        title: "Hiring Plan — Q4 2026",
        blocks: [
            { h: "Hiring Plan — Q4 2026", level: 1 },
            { p: "Total budgeted headcount additions this quarter: 6. Hiring manager for each role is listed in brackets." },
            { h: "Open roles" },
            { ol: [
                "Senior Instructor, Data Engineering (Shubham) x2: must have 6+ years with Spark, Airflow, and a cloud warehouse such as BigQuery or Snowflake. Budget ₹32–38 LPA.",
                "Backend Engineer (Priya): Node.js, PostgreSQL, experience with real-time systems. Budget ₹18–24 LPA.",
                "Performance Marketing Manager (Ananya): owns paid acquisition and the CAC target. Budget ₹16–20 LPA.",
                "Learner Success Associate (Karan) x1: handles support tickets and mentor scheduling. Budget ₹5–6 LPA.",
                "Content Designer (Rahul): turns instructor material into slides, quizzes, and assignments. Budget ₹8–10 LPA.",
            ] },
            { h: "Status as of October 5" },
            { ul: [
                "Senior Instructor: 2 candidates in final round (Meera Iyer and Arjun Rao). Offers expected by October 25.",
                "Backend Engineer: 11 candidates screened, 3 in technical round.",
                "Performance Marketing Manager: job post goes live October 8.",
            ] },
            { p: "Interview process for all roles: 30-minute screen, a take-home or teaching demo, a panel round, and a culture conversation with Shubham. Target time-to-offer is 21 days." },
        ],
    },
    {
        title: "Marketing Plan — Data Engineering Bootcamp Launch",
        blocks: [
            { h: "Bootcamp Launch Marketing Plan", level: 1 },
            { p: "Goal: 120 paid learners in the first cohort, which starts on December 1, 2026. Owner: Ananya Sharma. Total launch budget: ₹9 lakh." },
            { h: "Target audience" },
            { p: "Working data analysts and backend developers with 1–4 years of experience who want to move into data engineering. Primary cities: Bengaluru, Hyderabad, Pune, and the NCR region." },
            { h: "Channels and budget" },
            { ul: [
                "YouTube Shorts and long-form tutorials: ₹3.5 lakh (best cost per lead in September at ₹41).",
                "LinkedIn ads targeted at analysts: ₹2.5 lakh.",
                "Instagram: ₹1.5 lakh, reduced after the October 5 team sync decision.",
                "Free 3-day 'Build your first data pipeline' workshop: ₹1 lakh for ads and prizes.",
                "Alumni referral program: ₹5,000 off for both referrer and new learner, budget ₹50,000.",
            ] },
            { h: "Timeline" },
            { ol: [
                "October 15: landing page and waitlist live.",
                "October 28–30: free pipeline workshop.",
                "November 1: enrollments open with early-bird price of ₹49,999.",
                "November 15: early-bird ends, price goes to ₹59,999.",
                "December 1: cohort starts.",
            ] },
            { p: "Success metric: keep cost per paid learner under ₹6,000 for the launch, higher than the company-wide CAC target because it is a new program." },
        ],
    },
    {
        title: "Incident Postmortem — Video Platform Outage (Sep 18)",
        blocks: [
            { h: "Postmortem: Video Platform Outage, September 18, 2026", level: 1 },
            { p: "Severity: SEV-2. Duration: 2 hours 47 minutes (7:52 PM to 10:39 PM IST). Impact: about 3,400 learners could not play lesson videos during peak evening hours. Incident commander: Priya Nair." },
            { h: "What happened" },
            { p: "A CDN configuration change pushed at 7:45 PM set the cache TTL for video manifest files to zero. Every play request then went to the origin storage bucket, which hit its request rate limit and started returning 503 errors." },
            { h: "Timeline" },
            { ul: [
                "7:52 PM: first support tickets about videos not loading.",
                "8:20 PM: on-call engineer paged after error-rate alert crossed 5%.",
                "9:35 PM: root cause identified as the CDN TTL change.",
                "10:15 PM: configuration rolled back; cache warming started.",
                "10:39 PM: error rate back below 0.1%.",
            ] },
            { h: "Root causes" },
            { ul: [
                "CDN config changes were not code-reviewed and had no staging environment.",
                "The error-rate alert threshold was too high, which delayed paging by about 28 minutes.",
            ] },
            { h: "Follow-ups" },
            { ul: [
                "Move CDN configuration into Terraform with mandatory review (owner: Priya, due October 20).",
                "Lower the video error-rate alert threshold to 1% (done September 20).",
                "Extend all affected learners' access by 7 days as an apology (done September 19).",
            ] },
        ],
    },
    {
        title: "Pricing & Plans — 2026",
        blocks: [
            { h: "Pricing & Plans — 2026", level: 1 },
            { p: "All prices are in Indian rupees and include GST. No-cost EMI is available on all programs above ₹20,000 for 3, 6, or 9 months." },
            { h: "Programs" },
            { ul: [
                "SQL for Analysts (8 weeks): ₹7,999.",
                "Power BI & Excel Mastery (6 weeks): ₹6,499.",
                "Python for Data Analysis (10 weeks): ₹11,999.",
                "Data Analytics Pro (6 months, includes all three above plus placement support): ₹44,999.",
                "Data Engineering Bootcamp (16 weeks, launching December 2026): ₹59,999, early-bird ₹49,999 until November 15.",
            ] },
            { h: "Refund policy" },
            { p: "Full refund within 7 days of the start date if the learner has completed less than 20% of the content. After that, no refunds, but learners can defer to the next cohort once at no extra cost." },
            { h: "Discounts" },
            { ul: [
                "Students with a valid college ID: 25% off any individual course (not the bootcamp).",
                "Alumni: 15% off any new program.",
                "Corporate teams of 5 or more: custom pricing; contact Shubham.",
            ] },
        ],
    },
    {
        title: "Onboarding Guide for New Mentors",
        blocks: [
            { h: "Welcome, Mentor!", level: 1 },
            { p: "This guide is for new part-time mentors. Your onboarding buddy is Karan Mehta (Operations). Please finish everything here within your first week." },
            { h: "Week 1 checklist" },
            { ol: [
                "Sign the mentor agreement and share your bank details for payouts.",
                "Join the #mentors channel on Discord and introduce yourself.",
                "Watch the 45-minute 'How we mentor' training video.",
                "Shadow two live sessions run by senior mentors.",
                "Set your weekly availability in the scheduling tool (we especially need 7–10 PM slots).",
            ] },
            { h: "How sessions work" },
            { p: "Each 1:1 session is 30 minutes. Learners book through the platform and share their question in advance. After each session, fill in a 3-question feedback form. Our target mentor CSAT is 4.6 out of 5." },
            { h: "Payouts" },
            { p: "Mentors are paid ₹600 per completed 1:1 session and ₹2,500 per 90-minute group doubt-clearing session. Payouts happen on the 5th of every month for the previous month." },
            { h: "Ground rules" },
            { ul: [
                "Never share full assignment solutions; guide learners to the answer.",
                "If a learner reports a platform bug, log it in the #support channel with a screenshot.",
                "Escalate any learner wellbeing concerns to Karan the same day.",
            ] },
        ],
    },
    {
        title: "Monthly Business Review — September 2026",
        blocks: [
            { h: "Monthly Business Review — September 2026", level: 1 },
            { h: "Headline numbers" },
            { ul: [
                "Revenue: ₹1.86 crore (August: ₹1.71 crore, +8.8% month over month).",
                "New paid learners: 418 (August: 392).",
                "Active learners on the platform: 5,230.",
                "Trial-to-paid conversion: 9.5%.",
                "Blended CAC: ₹5,100 per paid learner.",
                "Refund rate: 3.2% of new enrollments.",
            ] },
            { h: "Revenue by program" },
            { ul: [
                "Data Analytics Pro: 58% of revenue.",
                "Python for Data Analysis: 17%.",
                "SQL for Analysts: 14%.",
                "Power BI & Excel Mastery: 9%.",
                "Corporate training: 2%.",
            ] },
            { h: "Commentary" },
            { p: "Growth came mostly from Data Analytics Pro, helped by two corporate referrals. The September 18 video outage cost an estimated ₹2.3 lakh in refunds and extensions. NPS fell from 46 to 41, mostly because of video buffering and mentor availability; both have fixes in progress." },
            { p: "Cash runway is 19 months at the current burn rate of ₹38 lakh per month." },
        ],
    },
    {
        title: "Data Engineering Bootcamp — Curriculum Draft",
        blocks: [
            { h: "Data Engineering Bootcamp — Curriculum Draft v0.3", level: 1 },
            { p: "16 weeks, live classes on Tuesday and Thursday evenings (8–10 PM) plus a Saturday lab. Max cohort size: 150. Lead instructors: two senior hires (see Hiring Plan)." },
            { h: "Modules" },
            { ol: [
                "Weeks 1–2: Python and SQL refresher, Linux and Git basics.",
                "Weeks 3–4: Data modelling: star schemas, slowly changing dimensions.",
                "Weeks 5–7: Batch processing with Apache Spark (PySpark).",
                "Weeks 8–9: Orchestration with Apache Airflow.",
                "Weeks 10–11: Cloud data warehouses: BigQuery and Snowflake, cost control.",
                "Week 12: Streaming basics with Kafka.",
                "Week 13: Data quality and testing with dbt and Great Expectations.",
                "Weeks 14–16: Capstone: build an end-to-end pipeline for a ride-sharing dataset, with a dashboard on top.",
            ] },
            { h: "Infrastructure" },
            { p: "Each learner gets a sandbox GCP project with a ₹2,000 credit cap, created automatically on enrollment. Estimated infrastructure cost: ₹2,400 per learner for the whole program." },
            { h: "Open questions" },
            { ul: [
                "Should Kafka get two weeks instead of one? Rahul thinks one is enough for a first cohort.",
                "Do we need a placement guarantee? Marketing wants it; finance is worried about the refund risk.",
            ] },
        ],
    },
];
