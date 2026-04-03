"""CLI entry point for the insurance claim preparation agent."""

import argparse
import sys
from pathlib import Path

from claim_agent.agents.analyzer import run_analyzer
from claim_agent.ingest import DOCUMENT_FORMATS, IMAGE_FORMATS


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Insurance Claim Preparation Agent — analyzes your documents and "
        "helps decide whether to file a claim",
    )
    parser.add_argument(
        "files",
        nargs="+",
        type=Path,
        help="Documents to analyze (PDFs, images, docs, spreadsheets)",
    )

    args = parser.parse_args()

    supported = DOCUMENT_FORMATS | IMAGE_FORMATS
    errors = []
    for f in args.files:
        if not f.exists():
            errors.append(f"File not found: {f}")
        elif f.suffix.lower().lstrip(".") not in supported:
            errors.append(f"Unsupported file type: {f} (supported: {', '.join(sorted(supported))})")

    if errors:
        for e in errors:
            print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    print("Analyzing your documents...\n")
    result = run_analyzer(args.files)
    print(result)


if __name__ == "__main__":
    main()
