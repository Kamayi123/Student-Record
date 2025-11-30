#!/usr/bin/env node
import { ensureDataFiles, readJSON, writeJSON } from './src/storage.js';
import { logInfo, logError } from './src/logger.js';
import { addStudent, listStudents, findStudent, updateStudentStatus } from './src/students.js';
import { markAttendance, listAttendance } from './src/attendance.js';
import { addActivity, listActivities } from './src/activities.js';
import { generateStudentsReport, generateAttendanceReport, generateActivitiesReport, generateStudentSummaryReport } from './src/reports.js';
import { parseArgs, printTable, exitWithMessage } from './src/utils.js';

await ensureDataFiles();

const argv = parseArgs(process.argv.slice(2));

function showHelp() {
  const help = `
Student Record System (CLI)

Usage:
  node index.js <domain> <action> [options]

Domains and actions:
  student add --name <name> --email <email> [--year <year>] [--status <active|inactive>]
  student list [--status <active|inactive>]
  student find (--id <id> | --email <email>) [--get <field>]
  student set-status --id <id> --status <active|inactive>

  attendance mark --studentId <id> --date <YYYY-MM-DD> --status <present|absent|late> [--note <text>]
  attendance list [--studentId <id>] [--from <YYYY-MM-DD>] [--to <YYYY-MM-DD>]

  activity add --studentId <id> --type <assignment|quiz|participation|other> --description <text>
  activity list [--studentId <id>] [--from <YYYY-MM-DD>] [--to <YYYY-MM-DD>]

  report students [--format <csv|json>] [--out <path>]
  report attendance [--format <csv|json>] [--from <YYYY-MM-DD>] [--to <YYYY-MM-DD>] [--studentId <id>] [--out <path>]
  report activities [--format <csv|json>] [--from <YYYY-MM-DD>] [--to <YYYY-MM-DD>] [--studentId <id>] [--out <path>]
  report student-summary --studentId <id> [--format <json|csv>] [--out <path>]

Examples:
  node index.js student add --name "Alice" --email "alice@example.com" --year "2025"
  node index.js attendance mark --studentId <id> --date 2025-11-30 --status present
  node index.js activity add --studentId <id> --type assignment --description "Math HW1"
  node index.js report students --format csv
`;
  console.log(help);
}

if (argv._.length === 0 || argv.help || argv['--help']) {
  showHelp();
  process.exit(0);
}

const [domain, action] = argv._;

try {
  switch (domain) {
    case 'student':
      await handleStudent(action, argv);
      break;
    case 'attendance':
      await handleAttendance(action, argv);
      break;
    case 'activity':
      await handleActivity(action, argv);
      break;
    case 'report':
      await handleReport(action, argv);
      break;
    default:
      exitWithMessage(`Unknown domain: ${domain}. Use --help for options.`);
  }
} catch (err) {
  logError(err?.stack || String(err));
  exitWithMessage(`Error: ${err.message || err}`);
}

async function handleStudent(action, args) {
  switch (action) {
    case 'add': {
      const name = args.name;
      const email = args.email;
      const year = args.year || args.cohort || 'general';
      const status = args.status || 'active';
      if (!name || !email) exitWithMessage('Missing --name or --email');
      const student = await addStudent({ name, email, year, status });
      logInfo(`Student added: ${student.name} (${student.id})`);
      console.log(student);
      break;
    }
    case 'list': {
      const status = args.status;
      const rows = await listStudents({ status });
      // Normalize for display
      const display = rows.map(r => ({ ...r, year: r.year ?? r.cohort }));
      printTable(display, ['id', 'name', 'email', 'year', 'status', 'enrolledOn']);
      break;
    }
    case 'find': {
      const id = args.id;
      const email = args.email;
      if (!id && !email) exitWithMessage('Provide --id or --email');
      const student = await findStudent({ id, email });
      if (!student) exitWithMessage('Student not found');
      if (args.get) {
        const key = args.get;
        if (!(key in student)) exitWithMessage(`Field not found: ${key}`);
        console.log(student[key]);
      } else {
        console.log(student);
      }
      break;
    }
    case 'set-status': {
      const id = args.id;
      const status = args.status;
      if (!id || !status) exitWithMessage('Provide --id and --status');
      const updated = await updateStudentStatus(id, status);
      console.log(updated);
      break;
    }
    default:
      exitWithMessage(`Unknown student action: ${action}`);
  }
}

async function handleAttendance(action, args) {
  switch (action) {
    case 'mark': {
      const { studentId, date, status, note } = args;
      if (!studentId || !date || !status) exitWithMessage('Missing --studentId, --date, or --status');
      const rec = await markAttendance({ studentId, date, status, note });
      console.log(rec);
      break;
    }
    case 'list': {
      const rows = await listAttendance({
        studentId: args.studentId,
        from: args.from,
        to: args.to,
      });
      printTable(rows, ['id', 'studentId', 'date', 'status', 'note']);
      break;
    }
    default:
      exitWithMessage(`Unknown attendance action: ${action}`);
  }
}

async function handleActivity(action, args) {
  switch (action) {
    case 'add': {
      const { studentId, type, description } = args;
      if (!studentId || !type || !description) exitWithMessage('Missing --studentId, --type, or --description');
      const rec = await addActivity({ studentId, type, description });
      console.log(rec);
      break;
    }
    case 'list': {
      const rows = await listActivities({
        studentId: args.studentId,
        from: args.from,
        to: args.to,
      });
      printTable(rows, ['id', 'studentId', 'timestamp', 'type', 'description']);
      break;
    }
    default:
      exitWithMessage(`Unknown activity action: ${action}`);
  }
}

async function handleReport(action, args) {
  const format = args.format || 'csv';
  switch (action) {
    case 'students': {
      const out = await generateStudentsReport({ format, outPath: args.out });
      console.log(`Report written: ${out}`);
      break;
    }
    case 'attendance': {
      const out = await generateAttendanceReport({
        format,
        from: args.from,
        to: args.to,
        studentId: args.studentId,
        outPath: args.out,
      });
      console.log(`Report written: ${out}`);
      break;
    }
    case 'activities': {
      const out = await generateActivitiesReport({
        format,
        from: args.from,
        to: args.to,
        studentId: args.studentId,
        outPath: args.out,
      });
      console.log(`Report written: ${out}`);
      break;
    }
    case 'student-summary': {
      const studentId = args.studentId;
      if (!studentId) exitWithMessage('Provide --studentId');
      const out = await generateStudentSummaryReport({ format: args.format || 'json', studentId, outPath: args.out });
      console.log(`Report written: ${out}`);
      break;
    }
    default:
      exitWithMessage(`Unknown report action: ${action}`);
  }
}
