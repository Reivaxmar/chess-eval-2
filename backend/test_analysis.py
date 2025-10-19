#!/usr/bin/env python3
"""
Simple test script to verify the backend analysis functionality.
This script tests the game analysis without requiring external API access.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from main import analyze_game

# A simple chess game PGN (Scholar's Mate)
SAMPLE_PGN = """[Event "Test Game"]
[Site "Test"]
[Date "2025.01.01"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0"""

def test_analysis():
    """Test the game analysis function."""
    print("Testing game analysis with sample PGN...")
    print("-" * 50)
    
    try:
        result = analyze_game(SAMPLE_PGN)
        
        print(f"White: {result['white_player']}")
        print(f"Black: {result['black_player']}")
        print(f"Result: {result['result']}")
        print(f"\nTotal moves analyzed: {len(result['moves'])}")
        print("-" * 50)
        
        # Show analysis for each move
        for move in result['moves']:
            print(f"\nMove {move['move_number']}: {move['move']}")
            print(f"  Classification: {move['classification']}")
            if move['eval_before'] is not None:
                print(f"  Eval before: {move['eval_before']:.2f}")
            if move['eval_after'] is not None:
                print(f"  Eval after: {move['eval_after']:.2f}")
            if move.get('best_move'):
                print(f"  Best move was: {move['best_move']['move']} ({move['best_move']['from_square']}-{move['best_move']['to_square']})")
        
        print("\n" + "=" * 50)
        print("✓ Analysis completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n✗ Error during analysis: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_analysis()
    sys.exit(0 if success else 1)
