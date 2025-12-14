package com.realestate.repository;

import com.realestate.entity.AgentMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AgentMessageRepository extends JpaRepository<AgentMessage, Long> {
    List<AgentMessage> findByAgentIdOrderByCreatedAtDesc(Long agentId);
}
