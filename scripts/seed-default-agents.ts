#!/usr/bin/env ts-node
/**
 * Seed Script: Default Agents → Database
 *
 * Seeds the database with built-in/default agents.
 * These are the 11 standard agents that come with the system.
 */

import { prisma } from '../lib/db/prisma';
import { agentManager } from '../lib/services/agentManager';

async function seedDefaultAgents() {
  console.log('🌱 Seeding default agents...\n');

  try {
    // Get hardcoded default agents
    const defaultAgents = agentManager.getDefaultAgents();

    let created = 0;
    let skipped = 0;

    for (const agent of defaultAgents) {
      try {
        // Check if agent already exists (by role, since default agents use numeric IDs)
        const existing = await prisma.customAgent.findFirst({
          where: {
            role: agent.role,
            isBuiltIn: true,
          },
        });

        if (existing) {
          console.log(`  ⏭️  Skipped (already exists): ${agent.name} - ${agent.role}`);
          skipped++;
          continue;
        }

        // Create built-in agent
        await prisma.customAgent.create({
          data: {
            id: `builtin-${agent.id}`, // Prefix to distinguish from custom agents
            name: agent.name,
            role: agent.role,
            emoji: agent.emoji,
            color: agent.color,
            description: agent.description,
            systemPrompt: agent.systemPrompt,
            capabilities: agent.capabilities,
            tools: agent.tools,
            model: agent.model,
            category: agent.category,
            configVariables: agent.configVariables || null,
            isBuiltIn: true,
          },
        });

        console.log(`  ✓ Created: ${agent.name} - ${agent.role}`);
        created++;
      } catch (error) {
        console.error(`  ✗ Failed to create ${agent.name}:`, error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SEED SUMMARY');
    console.log('='.repeat(60));
    console.log(`✓ Agents created:     ${created}`);
    console.log(`⏭️  Agents skipped:     ${skipped}`);
    console.log(`📋 Total agents:      ${defaultAgents.length}`);
    console.log('='.repeat(60));
    console.log('\n✅ Seeding completed!\n');

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seedDefaultAgents();
