import os

# All code files to gather — frontend + backend
files_to_gather = [
    # Frontend
    ('', 'app.js'),
    ('', 'index.html'),
    ('', 'map.js'),
    ('', 'map.html'),
    ('', 'carbon-credits.html'),
    ('', 'workflow.html'),
    ('', 'education.html'),
    ('', 'leaders.html'),
    ('', 'partners.html'),
    ('', 'mission.html'),
    ('', 'style.css'),
    ('', 'map.css'),
    ('', 'platform.css'),
    # Backend
    ('backend', 'requirements.txt'),
    ('backend', 'main.py'),
    ('backend', 'database.py'),
    ('backend', 'models.py'),
    ('backend/services', '__init__.py'),
    ('backend/services', 'gee_service.py'),
    ('backend/services', 'at_service.py'),
    ('backend/services', 'dmrv_ai.py'),
    ('backend/services', 'daraja_service.py'),
    ('backend/services', 'hedera_service.py'),
    # Artifacts (Tasks, Plans, Walkthroughs)
    ('C:/Users/grvns/.gemini/antigravity/brain/a8f8417b-9d1e-4695-b6bc-489397db81ac', 'task.md'),
    ('C:/Users/grvns/.gemini/antigravity/brain/a8f8417b-9d1e-4695-b6bc-489397db81ac', 'implementation_plan.md'),
    ('C:/Users/grvns/.gemini/antigravity/brain/a8f8417b-9d1e-4695-b6bc-489397db81ac', 'walkthrough.md'),
]

with open('full_codebase.txt', 'w', encoding='utf-8') as outfile:
    outfile.write("=" * 70 + "\n")
    outfile.write("CARBONPESA FULL CODEBASE DUMP\n")
    outfile.write("=" * 70 + "\n\n")
    for (folder, fname) in files_to_gather:
        path = os.path.join(folder, fname) if folder else fname
        if os.path.exists(path):
            size = os.path.getsize(path)
            outfile.write(f"\n{'=' * 70}\n")
            outfile.write(f"FILE: {path}  ({size} bytes)\n")
            outfile.write(f"{'=' * 70}\n\n")
            with open(path, 'r', encoding='utf-8') as infile:
                outfile.write(infile.read())
            outfile.write(f"\n\n{'— END ' + path + ' —':^70}\n")
        else:
            outfile.write(f"\n[MISSING] {path}\n")

print("Done. full_codebase.txt updated.")
