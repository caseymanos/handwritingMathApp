#!/bin/bash

# Test Execution Script
# Runs Jest tests with various configurations

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default options
COVERAGE=false
WATCH=false
UPDATE_SNAPSHOTS=false
VERBOSE=false
SPECIFIC_TEST=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -w|--watch)
            WATCH=true
            shift
            ;;
        -u|--update-snapshots)
            UPDATE_SNAPSHOTS=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -t|--test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: ./scripts/test.sh [options]"
            echo ""
            echo "Options:"
            echo "  -c, --coverage           Run with coverage report"
            echo "  -w, --watch              Run in watch mode"
            echo "  -u, --update-snapshots   Update Jest snapshots"
            echo "  -v, --verbose            Verbose output"
            echo "  -t, --test <pattern>     Run specific test file/pattern"
            echo "  -h, --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./scripts/test.sh                    # Run all tests"
            echo "  ./scripts/test.sh -c                 # With coverage"
            echo "  ./scripts/test.sh -w                 # Watch mode"
            echo "  ./scripts/test.sh -t canvasStore     # Specific test"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Build Jest command
JEST_CMD="npx jest"

if [ "$COVERAGE" = true ]; then
    JEST_CMD="$JEST_CMD --coverage"
    echo -e "${BLUE}📊 Running tests with coverage...${NC}"
fi

if [ "$WATCH" = true ]; then
    JEST_CMD="$JEST_CMD --watch"
    echo -e "${BLUE}👀 Running in watch mode...${NC}"
fi

if [ "$UPDATE_SNAPSHOTS" = true ]; then
    JEST_CMD="$JEST_CMD --updateSnapshot"
    echo -e "${YELLOW}📸 Updating snapshots...${NC}"
fi

if [ "$VERBOSE" = true ]; then
    JEST_CMD="$JEST_CMD --verbose"
fi

if [ -n "$SPECIFIC_TEST" ]; then
    JEST_CMD="$JEST_CMD --testPathPattern=$SPECIFIC_TEST"
    echo -e "${BLUE}🎯 Running tests matching: $SPECIFIC_TEST${NC}"
fi

# Clear Jest cache
echo -e "${YELLOW}🧹 Clearing Jest cache...${NC}"
npx jest --clearCache

# Run tests
echo -e "${GREEN}🧪 Running tests...${NC}"
eval $JEST_CMD

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"

    if [ "$COVERAGE" = true ]; then
        echo -e "${BLUE}📊 Coverage report available at: coverage/lcov-report/index.html${NC}"

        # Optional: Open coverage report in browser (macOS)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            read -p "Open coverage report in browser? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                open coverage/lcov-report/index.html
            fi
        fi
    fi
else
    echo -e "${RED}❌ Tests failed!${NC}"
    exit 1
fi
