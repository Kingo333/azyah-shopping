import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Eye, ExternalLink, Heart, ShoppingCart } from 'lucide-react';

interface CustomerJourneyFlowProps {
  funnelData: Array<{
    stage: string;
    count: number;
    percentage: number;
    conversion_rate: number;
  }>;
}

// Custom node component for funnel stages
const FunnelNode = ({ data }: { data: any }) => {
  const Icon = data.icon;
  
  return (
    <div className="bg-white border-2 border-border rounded-lg p-4 shadow-lg min-w-[200px] relative">
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#8b5cf6', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#8b5cf6', width: 8, height: 8 }}
      />
      
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-full ${data.bgColor}`}>
          <Icon className={`h-5 w-5 ${data.color}`} />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{data.stage}</h3>
          <p className="text-xs text-muted-foreground">{data.description}</p>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">{data.count.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">{data.percentage}%</span>
        </div>
        
        {data.conversionRate && (
          <div className="text-xs text-green-600 font-medium">
            {data.conversionRate}% conversion
          </div>
        )}
        
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${data.progressColor}`}
            style={{ width: `${data.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  funnelStage: FunnelNode,
};

export const CustomerJourneyFlow: React.FC<CustomerJourneyFlowProps> = ({ funnelData }) => {
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!funnelData || funnelData.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    // Map funnel stages to visual elements
    const stageConfig = {
      'Product Views': {
        icon: Eye,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        progressColor: 'bg-blue-500',
        description: 'Users browse products'
      },
      'External Store Clicks': {
        icon: ExternalLink,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        progressColor: 'bg-green-500',
        description: 'Users click "Shop Now"'
      },
      'Wishlist Additions': {
        icon: Heart,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50',
        progressColor: 'bg-pink-500',
        description: 'Users save products'
      },
      'Actual Purchases': {
        icon: ShoppingCart,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        progressColor: 'bg-purple-500',
        description: 'Users complete purchase'
      }
    };

    const nodes: Node[] = funnelData.map((stage, index) => {
      const config = stageConfig[stage.stage as keyof typeof stageConfig] || {
        icon: Eye,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        progressColor: 'bg-gray-500',
        description: stage.stage
      };

      return {
        id: `stage-${index}`,
        type: 'funnelStage',
        position: { x: index * 280, y: 50 },
        data: {
          stage: stage.stage,
          count: stage.count,
          percentage: stage.percentage,
          conversionRate: index > 0 ? stage.conversion_rate : null,
          ...config
        },
        draggable: false,
      };
    });

    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: `stage-${i}`,
        target: `stage-${i + 1}`,
        type: 'smoothstep',
        animated: true,
        style: { strokeWidth: 3, stroke: '#8b5cf6' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#8b5cf6',
        },
        label: funnelData[i + 1] ? `${funnelData[i + 1].conversion_rate}%` : '',
        labelStyle: { 
          fontSize: 12, 
          fontWeight: 'bold',
          fill: '#8b5cf6'
        },
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [funnelData]);

  const [nodes] = useNodesState(initialNodes);
  const [edges] = useEdgesState(initialEdges);

  if (!funnelData || funnelData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No funnel data available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: 'transparent' }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnScroll={false}
        panOnDrag={false}
      >
        <Background color="#f1f5f9" gap={16} />
        <Controls showZoom={false} showFitView={false} showInteractive={false} />
      </ReactFlow>
    </div>
  );
};