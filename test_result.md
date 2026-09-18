#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

## user_problem_statement: Tasklio offline rewards + mini-games app. Latest fixes: (1) no "+0" history entries when user earns nothing; (2) rejected withdrawal creates a refund entry in Recent activity; (3) Wallet Recent activity capped at 10 items with a "View all" button to /recent-activity; (4) home header + drawer menu layout compacted (smaller sizes, no extra gaps).
##
## frontend:
##   - task: "No +0 history entries on zero-point earnings"
##     implemented: true
##     working: "NA"
##     file: "frontend/src/store/app-store.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "earnPoints skips txn creation when points === 0"
##   - task: "Rejected payout creates refund history entry"
##     implemented: true
##     working: "NA"
##     file: "frontend/src/store/app-store.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "setPayoutStatus(failed) adds kind=payout txn with +refund points"
##   - task: "Wallet recent activity capped at 10 + View all button"
##     implemented: true
##     working: "NA"
##     file: "frontend/app/wallet.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "Recent activity tab shows max 10 entries, View all navigates to /recent-activity"
##   - task: "Compact home header and drawer menu layout"
##     implemented: true
##     working: "NA"
##     file: "frontend/app/home.tsx, frontend/src/components/drawer-menu.tsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "Reduced sizes/gaps in home header and drawer; header icons hug edges with explicit spacing"
##
## test_plan:
##   current_focus:
##     - "No +0 history entries on zero-point earnings"
##     - "Rejected payout creates refund history entry"
##     - "Wallet recent activity capped at 10 + View all button"
##     - "Compact home header and drawer menu layout"
##   test_all: false
##   test_priority: "high_first"
##
## agent_communication:
##     -agent: "main"
##     -message: "Iteration 4 changes to verify: (1) Quiz Time now ends with the shared GameResult popup (testID game-result) instead of an inline screen, and awarding 0 pts (all wrong) creates NO history entry. (2) Home header compact: smaller 'Hii, <name>' with a subtext 'Let's earn some rewards today', tighter spacing between menu/greeting/points/bell. (3) Games row spacing reduced so ~4.5 game tiles are visible at once. (4) Deleted games entirely: Tap Race, Lucky Draw, Snake, Balloon Pop, Higher Card (routes/files removed; remaining games: Spin&Win, Puzzle Dash, Quiz Time, Tic Tac Toe, Hi-Lo, Whack-a-Mole, Math Blitz, 2048, Mine Pick). (5) New Daily Check-in card below banners: visible only when today's reward is unclaimed, 7-day increasing streak (10/20/35/50/75/100/150), Claim shows GameResult popup, hides after claim. (6) Drawer 'Restricted Area' row is faded (opacity 0.45); SINGLE tap does nothing, DOUBLE tap (within 400ms) opens an Access Key dialog (testID access-key-dialog, input access-key-input, submit access-key-submit); correct key '9372@Altaf93Tasklio' navigates to /admin; wrong key shows an innocuous 'Thank you!' dialog (testID thanks-dialog). (7) Admin panel: removed the PIN entry screen (/restricted route deleted), removed Change admin PIN section, removed Data & backup (export/import/reset). Admin is now reached ONLY via the drawer access-key flow. Test credentials: create any account in-app; admin access key is 9372@Altaf93Tasklio."